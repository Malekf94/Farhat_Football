#!/usr/bin/env node
// ============================================================================
// Schema migration runner (DB-001)
// ----------------------------------------------------------------------------
// This repository has no ORM and no migration framework, and adding one would
// mean a new dependency. This runner uses the `pg` client the app already
// depends on, and nothing else.
//
// The model is baseline + migrations:
//
//   version 0000  the repo-root schema.sql, a pg_dump of production. It is the
//                 starting point every environment shares.
//   0001, 0002…   migrations/NNNN_name.sql, applied in version order, each in
//                 its own transaction.
//
// Applied versions are recorded in public.schema_migrations, so the state of a
// database is queryable rather than remembered.
//
// Commands:
//   status      report baseline state, applied versions and what is pending
//   provision   empty database: apply the baseline, stamp 0000, then migrate
//   baseline    existing database that already matches schema.sql: stamp 0000
//               WITHOUT applying it, so `up` can take over from there
//   up          apply every pending migration in order
//
// Flags: --dir <path> (migrations dir), --baseline <path>, --url <conn string>
//
// Reads DATABASE_URL. Nothing here writes to players.account_balance — balance
// is owned by the payments trigger.
// ============================================================================

const { createHash } = require("node:crypto");
const { readFileSync, readdirSync, existsSync } = require("node:fs");
const { resolve, join, basename } = require("node:path");
const { Client } = require("pg");

const APP_ROOT = resolve(__dirname, "..");
const DEFAULT_MIGRATIONS_DIR = join(APP_ROOT, "migrations");
const DEFAULT_BASELINE = resolve(APP_ROOT, "..", "schema.sql");

const BASELINE_VERSION = "0000";
const MIGRATION_FILE = /^(\d{4})_([A-Za-z0-9._-]+)\.sql$/;

// schema.sql ends with `SELECT pg_catalog.set_config('search_path', '', false)`,
// so every statement this runner issues is schema-qualified. An unqualified
// `schema_migrations` resolves to nothing once the baseline has run.
const LEDGER = "public.schema_migrations";

const CREATE_LEDGER = `
	CREATE TABLE IF NOT EXISTS ${LEDGER} (
		version     text PRIMARY KEY,
		name        text NOT NULL,
		checksum    text NOT NULL,
		applied_at  timestamptz NOT NULL DEFAULT now(),
		applied_by  text NOT NULL DEFAULT current_user
	);
`;

const checksum = (text) =>
	createHash("sha256").update(text, "utf8").digest("hex").slice(0, 16);

const parseArgs = (argv) => {
	const options = { command: argv[0] };
	for (let i = 1; i < argv.length; i += 1) {
		const flag = argv[i];
		if (flag === "--dir") options.dir = argv[(i += 1)];
		else if (flag === "--baseline") options.baseline = argv[(i += 1)];
		else if (flag === "--url") options.url = argv[(i += 1)];
		else throw new Error(`Unknown argument: ${flag}`);
	}
	return options;
};

// Migrations are ordered by their numeric version, never by readdir order.
const readMigrations = (dir) => {
	if (!existsSync(dir)) return [];
	const found = [];
	for (const file of readdirSync(dir)) {
		if (!file.endsWith(".sql")) continue;
		const match = MIGRATION_FILE.exec(file);
		if (!match) {
			throw new Error(
				`Migration filename must look like 0001_description.sql — found "${file}"`,
			);
		}
		if (match[1] === BASELINE_VERSION) {
			throw new Error(
				`Version ${BASELINE_VERSION} is reserved for the schema.sql baseline — rename "${file}"`,
			);
		}
		const sql = readFileSync(join(dir, file), "utf8");
		found.push({
			version: match[1],
			name: match[2],
			file,
			sql,
			checksum: checksum(sql),
		});
	}
	found.sort((a, b) => a.version.localeCompare(b.version));

	const seen = new Set();
	for (const migration of found) {
		if (seen.has(migration.version)) {
			throw new Error(`Duplicate migration version ${migration.version}`);
		}
		seen.add(migration.version);
	}
	return found;
};

const ledgerExists = async (client) => {
	const { rows } = await client.query(
		`SELECT to_regclass($1) IS NOT NULL AS present`,
		[LEDGER],
	);
	return rows[0].present;
};

const appliedRows = async (client) => {
	if (!(await ledgerExists(client))) return [];
	const { rows } = await client.query(
		`SELECT version, name, checksum, applied_at FROM ${LEDGER} ORDER BY version`,
	);
	return rows;
};

const publicTableCount = async (client) => {
	const { rows } = await client.query(
		`SELECT count(*)::int AS count
		 FROM information_schema.tables
		 WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
	);
	return rows[0].count;
};

// A migration edited after it was applied means the database and the file no
// longer agree, and no later migration can be trusted to assume either state.
const assertNoDrift = (applied, migrations) => {
	const byVersion = new Map(applied.map((row) => [row.version, row]));
	for (const migration of migrations) {
		const row = byVersion.get(migration.version);
		if (row && row.checksum !== migration.checksum) {
			throw new Error(
				`Migration ${migration.file} changed after it was applied ` +
					`(recorded ${row.checksum}, file ${migration.checksum}). ` +
					`Applied migrations are immutable — add a new one instead.`,
			);
		}
	}
};

const record = (client, version, name, sum) =>
	client.query(
		`INSERT INTO ${LEDGER} (version, name, checksum) VALUES ($1, $2, $3)`,
		[version, name, sum],
	);

// Each migration is its own transaction: a failure rolls that migration back
// whole and leaves every later one unapplied, so the ledger never claims a
// half-applied version.
const applyMigration = async (client, migration) => {
	await client.query("BEGIN");
	try {
		await client.query(migration.sql);
		await client.query(CREATE_LEDGER);
		await record(client, migration.version, migration.name, migration.checksum);
		await client.query("COMMIT");
	} catch (error) {
		await client.query("ROLLBACK");
		throw new Error(`${migration.file} failed and was rolled back: ${error.message}`);
	}
};

const runPending = async (client, migrations) => {
	const applied = await appliedRows(client);
	assertNoDrift(applied, migrations);

	const done = new Set(applied.map((row) => row.version));
	const pending = migrations.filter((m) => !done.has(m.version));

	if (pending.length === 0) {
		console.log("Up to date — no pending migrations.");
		return 0;
	}
	for (const migration of pending) {
		console.log(`Applying ${migration.file} …`);
		await applyMigration(client, migration);
	}
	console.log(`Applied ${pending.length} migration(s).`);
	return pending.length;
};

const commands = {
	async status(client, { migrations, baselinePath }) {
		const tables = await publicTableCount(client);
		const applied = await appliedRows(client);
		const stamped = applied.some((row) => row.version === BASELINE_VERSION);

		console.log(`Baseline file      : ${baselinePath}`);
		console.log(`Public tables      : ${tables}`);
		console.log(`Ledger present     : ${await ledgerExists(client)}`);
		console.log(`Baseline stamped   : ${stamped}`);

		if (applied.length === 0) {
			console.log("Applied versions   : none");
		} else {
			console.log("Applied versions   :");
			for (const row of applied) {
				console.log(
					`  ${row.version}  ${row.name}  ${row.checksum}  ${row.applied_at.toISOString()}`,
				);
			}
		}

		const done = new Set(applied.map((row) => row.version));
		const pending = migrations.filter((m) => !done.has(m.version));
		console.log(
			pending.length === 0
				? "Pending            : none"
				: `Pending            : ${pending.map((m) => m.file).join(", ")}`,
		);

		// Reported rather than thrown, so `status` still works as a diagnostic
		// on a database that has drifted.
		try {
			assertNoDrift(applied, migrations);
		} catch (error) {
			console.log(`DRIFT              : ${error.message}`);
		}
	},

	async provision(client, { migrations, baselinePath }) {
		const tables = await publicTableCount(client);
		if (tables > 0) {
			throw new Error(
				`provision expects an empty database, but public already holds ${tables} table(s). ` +
					`Use "baseline" to adopt an existing database, or "up" to migrate one already stamped.`,
			);
		}
		const sql = readFileSync(baselinePath, "utf8");
		console.log(`Applying baseline ${basename(baselinePath)} …`);
		await client.query("BEGIN");
		try {
			await client.query(sql);
			await client.query(CREATE_LEDGER);
			await record(client, BASELINE_VERSION, "baseline", checksum(sql));
			await client.query("COMMIT");
		} catch (error) {
			await client.query("ROLLBACK");
			throw new Error(`Baseline failed and was rolled back: ${error.message}`);
		}
		await runPending(client, migrations);
	},

	async baseline(client, { baselinePath }) {
		await client.query(CREATE_LEDGER);
		const applied = await appliedRows(client);
		if (applied.some((row) => row.version === BASELINE_VERSION)) {
			throw new Error("Baseline is already stamped — nothing to do.");
		}
		const tables = await publicTableCount(client);
		if (tables === 0) {
			throw new Error(
				"baseline stamps an EXISTING schema as already applied, but this database is empty. " +
					'Use "provision" instead.',
			);
		}
		const sql = readFileSync(baselinePath, "utf8");
		await record(client, BASELINE_VERSION, "baseline", checksum(sql));
		console.log(
			`Stamped ${BASELINE_VERSION} against the existing schema (${tables} tables). ` +
				"Nothing was applied.",
		);
	},

	async up(client, { migrations }) {
		const applied = await appliedRows(client);
		if (!applied.some((row) => row.version === BASELINE_VERSION)) {
			throw new Error(
				'No baseline recorded. Run "provision" on an empty database, or "baseline" on one ' +
					"that already matches schema.sql.",
			);
		}
		await runPending(client, migrations);
	},
};

const main = async () => {
	const options = parseArgs(process.argv.slice(2));
	const command = commands[options.command];
	if (!command) {
		console.error(
			`Usage: node scripts/migrate.cjs <${Object.keys(commands).join("|")}> ` +
				"[--dir <migrations>] [--baseline <schema.sql>] [--url <connection string>]",
		);
		process.exit(2);
	}

	const connectionString = options.url || process.env.DATABASE_URL;
	if (!connectionString) {
		throw new Error("DATABASE_URL is not set (or pass --url).");
	}

	const context = {
		migrations: readMigrations(options.dir || DEFAULT_MIGRATIONS_DIR),
		baselinePath: options.baseline || DEFAULT_BASELINE,
	};
	if (!existsSync(context.baselinePath)) {
		throw new Error(`Baseline file not found: ${context.baselinePath}`);
	}

	const client = new Client({ connectionString });
	await client.connect();
	try {
		await command(client, context);
	} finally {
		await client.end();
	}
};

main().catch((error) => {
	console.error(`migrate: ${error.message}`);
	process.exit(1);
});
