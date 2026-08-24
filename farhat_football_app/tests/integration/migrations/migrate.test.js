import { describe, it, expect, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import pg from "pg";

// The migration runner (DB-001) talks to a real database by definition, so it is
// covered here rather than in the unit suite — the DB-pool constraint in
// .claude/rules/testing.md rules out faking the client.
//
// Every case runs against its OWN scratch database inside the same disposable
// container, created and dropped per test. The shared ff_test database is left
// alone: these tests provision from empty, which resetDatabase() cannot undo.

const MIGRATE = resolve(process.cwd(), "scripts/migrate.cjs");
const BASELINE = resolve(process.cwd(), "../schema.sql");

const adminUrl = (database) => {
	const url = new URL(process.env.TEST_DATABASE_URL);
	url.pathname = `/${database}`;
	return url.toString();
};

let counter = 0;
const created = [];

const adminQuery = async (sql) => {
	const client = new pg.Client({ connectionString: adminUrl("postgres") });
	await client.connect();
	try {
		return await client.query(sql);
	} finally {
		await client.end();
	}
};

const createScratchDb = async () => {
	counter += 1;
	const name = `mig_test_${process.pid}_${counter}`;
	await adminQuery(`DROP DATABASE IF EXISTS ${name}`);
	await adminQuery(`CREATE DATABASE ${name}`);
	created.push(name);
	return { name, url: adminUrl(name) };
};

const query = async (url, sql) => {
	const client = new pg.Client({ connectionString: url });
	await client.connect();
	try {
		return await client.query(sql);
	} finally {
		await client.end();
	}
};

// Returns the outcome rather than throwing, so a test can assert on a refusal.
const migrate = (args) => {
	try {
		const stdout = execFileSync(process.execPath, [MIGRATE, ...args], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		});
		return { ok: true, stdout, stderr: "" };
	} catch (error) {
		return {
			ok: false,
			stdout: error.stdout ?? "",
			stderr: error.stderr ?? "",
		};
	}
};

const migrationsDir = (files) => {
	const dir = mkdtempSync(join(tmpdir(), "ff-migrations-"));
	for (const [name, sql] of Object.entries(files)) {
		writeFileSync(join(dir, name), sql, "utf8");
	}
	return dir;
};

const TWO_GOOD = {
	"0001_add_widgets.sql":
		"CREATE TABLE public.widgets (id integer PRIMARY KEY, label text);",
	"0002_add_widget_colour.sql":
		"ALTER TABLE public.widgets ADD COLUMN colour text;",
};

afterAll(async () => {
	for (const name of created) {
		await adminQuery(`DROP DATABASE IF EXISTS ${name}`);
	}
});

describe("migrate.cjs", () => {
	it("provisions an empty database from the baseline and then applies migrations in order", async () => {
		const { url } = await createScratchDb();
		const dir = migrationsDir(TWO_GOOD);

		const result = migrate(["provision", "--url", url, "--dir", dir, "--baseline", BASELINE]);
		expect(result.stderr).toBe("");
		expect(result.ok).toBe(true);

		// The baseline really loaded: a production table and the payment trigger.
		const players = await query(url, "SELECT to_regclass('public.players') AS t");
		expect(players.rows[0].t).toBe("players");
		const trigger = await query(
			url,
			"SELECT tgname FROM pg_trigger WHERE tgname = 'trg_apply_payment'",
		);
		expect(trigger.rows).toHaveLength(1);

		// Both migrations ran, and the second depended on the first having run.
		const colour = await query(
			url,
			`SELECT column_name FROM information_schema.columns
			 WHERE table_name = 'widgets' AND column_name = 'colour'`,
		);
		expect(colour.rows).toHaveLength(1);

		const ledger = await query(
			url,
			"SELECT version, name FROM public.schema_migrations ORDER BY version",
		);
		expect(ledger.rows.map((r) => r.version)).toEqual(["0000", "0001", "0002"]);
		expect(ledger.rows[0].name).toBe("baseline");
		expect(ledger.rows[2].name).toBe("add_widget_colour");

		rmSync(dir, { recursive: true, force: true });
	});

	it("is idempotent — a second run applies nothing and records nothing new", async () => {
		const { url } = await createScratchDb();
		const dir = migrationsDir(TWO_GOOD);

		migrate(["provision", "--url", url, "--dir", dir, "--baseline", BASELINE]);
		const again = migrate(["up", "--url", url, "--dir", dir, "--baseline", BASELINE]);

		expect(again.ok).toBe(true);
		expect(again.stdout).toContain("Up to date");

		const ledger = await query(
			url,
			"SELECT count(*)::int AS n FROM public.schema_migrations",
		);
		expect(ledger.rows[0].n).toBe(3);

		rmSync(dir, { recursive: true, force: true });
	});

	it("rolls a failing migration back whole, records nothing, and stops the ones after it", async () => {
		const { url } = await createScratchDb();
		const dir = migrationsDir({
			"0001_add_widgets.sql":
				"CREATE TABLE public.widgets (id integer PRIMARY KEY, label text);",
			// Valid statement first, then a guaranteed failure: the whole file
			// must roll back, taking the good statement with it.
			"0002_half_broken.sql":
				"CREATE TABLE public.gadgets (id integer PRIMARY KEY);\n" +
				"ALTER TABLE public.no_such_table ADD COLUMN nope text;",
			"0003_never_runs.sql": "CREATE TABLE public.later (id integer PRIMARY KEY);",
		});

		const result = migrate(["provision", "--url", url, "--dir", dir, "--baseline", BASELINE]);
		expect(result.ok).toBe(false);
		expect(result.stderr).toContain("0002_half_broken.sql");
		expect(result.stderr).toContain("rolled back");

		// The good statement inside the failed migration was undone.
		const gadgets = await query(url, "SELECT to_regclass('public.gadgets') AS t");
		expect(gadgets.rows[0].t).toBeNull();

		// The migration after it never ran.
		const later = await query(url, "SELECT to_regclass('public.later') AS t");
		expect(later.rows[0].t).toBeNull();

		// The ledger stops at the last migration that actually committed.
		const ledger = await query(
			url,
			"SELECT version FROM public.schema_migrations ORDER BY version",
		);
		expect(ledger.rows.map((r) => r.version)).toEqual(["0000", "0001"]);

		rmSync(dir, { recursive: true, force: true });
	});

	it("refuses to continue when an already-applied migration has been edited", async () => {
		const { url } = await createScratchDb();
		const dir = migrationsDir(TWO_GOOD);
		migrate(["provision", "--url", url, "--dir", dir, "--baseline", BASELINE]);

		writeFileSync(
			join(dir, "0001_add_widgets.sql"),
			"CREATE TABLE public.widgets (id integer PRIMARY KEY, label text, extra text);",
			"utf8",
		);
		writeFileSync(join(dir, "0003_new_one.sql"), "CREATE TABLE public.fresh (id integer);", "utf8");

		const result = migrate(["up", "--url", url, "--dir", dir, "--baseline", BASELINE]);
		expect(result.ok).toBe(false);
		expect(result.stderr).toContain("changed after it was applied");

		// The pending migration was not applied while the tree is in doubt.
		const fresh = await query(url, "SELECT to_regclass('public.fresh') AS t");
		expect(fresh.rows[0].t).toBeNull();

		rmSync(dir, { recursive: true, force: true });
	});

	it("refuses to provision a database that already has tables", async () => {
		const { url } = await createScratchDb();
		const dir = migrationsDir(TWO_GOOD);
		migrate(["provision", "--url", url, "--dir", dir, "--baseline", BASELINE]);

		const second = migrate(["provision", "--url", url, "--dir", dir, "--baseline", BASELINE]);
		expect(second.ok).toBe(false);
		expect(second.stderr).toContain("expects an empty database");

		rmSync(dir, { recursive: true, force: true });
	});

	it("adopts an existing schema with baseline, stamping 0000 without applying it", async () => {
		const { url } = await createScratchDb();
		const empty = migrationsDir({});

		// Stand in for the hand-managed production database: the schema is
		// already there, but nothing has ever been recorded.
		await query(url, "CREATE TABLE public.players (player_id integer PRIMARY KEY)");

		const stamped = migrate(["baseline", "--url", url, "--dir", empty, "--baseline", BASELINE]);
		expect(stamped.ok).toBe(true);
		expect(stamped.stdout).toContain("Nothing was applied");

		// Proof it did not apply the baseline over the top: the real schema.sql
		// players table has many columns, this stand-in still has exactly one.
		const columns = await query(
			url,
			`SELECT count(*)::int AS n FROM information_schema.columns
			 WHERE table_schema = 'public' AND table_name = 'players'`,
		);
		expect(columns.rows[0].n).toBe(1);

		// From that recorded version, up takes over normally.
		const dir = migrationsDir(TWO_GOOD);
		const upgraded = migrate(["up", "--url", url, "--dir", dir, "--baseline", BASELINE]);
		expect(upgraded.ok).toBe(true);

		const ledger = await query(
			url,
			"SELECT version FROM public.schema_migrations ORDER BY version",
		);
		expect(ledger.rows.map((r) => r.version)).toEqual(["0000", "0001", "0002"]);

		rmSync(dir, { recursive: true, force: true });
		rmSync(empty, { recursive: true, force: true });
	});

	it("refuses up on a database with no recorded baseline", async () => {
		const { url } = await createScratchDb();
		const dir = migrationsDir(TWO_GOOD);

		const result = migrate(["up", "--url", url, "--dir", dir, "--baseline", BASELINE]);
		expect(result.ok).toBe(false);
		expect(result.stderr).toContain("No baseline recorded");

		rmSync(dir, { recursive: true, force: true });
	});

	it("refuses a migration filename it cannot order", async () => {
		const { url } = await createScratchDb();
		const dir = migrationsDir({ "add-widgets.sql": "SELECT 1;" });

		const result = migrate(["status", "--url", url, "--dir", dir, "--baseline", BASELINE]);
		expect(result.ok).toBe(false);
		expect(result.stderr).toContain("0001_description.sql");

		rmSync(dir, { recursive: true, force: true });
	});

	it("reports applied versions and pending files through status", async () => {
		const { url } = await createScratchDb();
		const dir = migrationsDir(TWO_GOOD);
		migrate(["provision", "--url", url, "--dir", dir, "--baseline", BASELINE]);

		writeFileSync(join(dir, "0003_pending.sql"), "CREATE TABLE public.pending (id integer);", "utf8");

		const result = migrate(["status", "--url", url, "--dir", dir, "--baseline", BASELINE]);
		expect(result.ok).toBe(true);
		expect(result.stdout).toContain("Baseline stamped   : true");
		expect(result.stdout).toContain("0001  add_widgets");
		expect(result.stdout).toContain("Pending            : 0003_pending.sql");

		rmSync(dir, { recursive: true, force: true });
	});
});
