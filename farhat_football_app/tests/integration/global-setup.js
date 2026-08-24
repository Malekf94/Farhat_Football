import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Integration tests run against a disposable PostgreSQL container seeded from
// the repo-root schema.sql dump, so the trigger and constraint behaviour under
// test is the real thing rather than a hand-written approximation.
//
// The image is pinned to the major version production reports in that dump
// (16.13) — a trigger or ON CONFLICT difference between majors would make
// these tests lie.

const IMAGE = "postgres:16";
const CONTAINER = "ff-integration-test-db";
const DB = "ff_test";
const USER = "postgres";
const PASSWORD = "postgres";

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATE = resolve(here, "../../scripts/migrate.cjs");

const docker = (args, options = {}) =>
	execFileSync("docker", args, {
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
		...options,
	});

const removeContainer = () => {
	try {
		docker(["rm", "-f", CONTAINER], { stdio: "pipe" });
	} catch {
		// Nothing to remove.
	}
};

const waitForReady = async () => {
	const deadline = Date.now() + 60_000;
	let lastError;
	while (Date.now() < deadline) {
		try {
			// Over TCP, not the unix socket. The image runs a temporary server
			// during initdb that listens on the socket only; asking it there
			// reports ready, and the schema load then races that server's shutdown.
			docker(
				["exec", CONTAINER, "pg_isready", "-h", "127.0.0.1", "-p", "5432", "-U", USER, "-d", DB],
				{ stdio: "pipe" },
			);
			return;
		} catch (error) {
			// pg_isready exits non-zero until the server accepts connections.
			lastError = error;
			await new Promise((done) => setTimeout(done, 500));
		}
	}
	throw new Error(
		`${CONTAINER} did not become ready within 60s: ${lastError?.message ?? "unknown"}`,
	);
};

// DB-001 removed the pg_dump-17-only `SET transaction_timeout` from schema.sql,
// so the dump now loads into PostgreSQL 16 unedited and this harness no longer
// filters it. If that line comes back — someone regenerating the dump with
// pg_dump 17 — provisioning fails loudly here rather than being papered over.

export default async function setup({ provide }) {
	try {
		docker(["version", "--format", "{{.Server.Version}}"], { stdio: "pipe" });
	} catch {
		throw new Error(
			"Integration tests need a running Docker daemon. Start Docker, or run `npm test` for the unit suite.",
		);
	}

	removeContainer();

	docker([
		"run",
		"--detach",
		"--name",
		CONTAINER,
		"--env",
		`POSTGRES_PASSWORD=${PASSWORD}`,
		"--env",
		`POSTGRES_DB=${DB}`,
		// Let Docker pick the host port so a local PostgreSQL on 5432 is never
		// in the way, and bind to loopback only.
		"--publish",
		"127.0.0.1::5432",
		IMAGE,
	]);

	await waitForReady();

	const mapping = docker(["port", CONTAINER, "5432/tcp"]).trim().split("\n")[0];
	const port = mapping.slice(mapping.lastIndexOf(":") + 1);
	const url = `postgres://${USER}:${PASSWORD}@127.0.0.1:${port}/${DB}`;

	// Provision through the real migration runner (DB-001) rather than piping
	// the dump into psql. The suite then exercises the same path an operator
	// uses on a new environment, so "provision works" is asserted by every run
	// instead of being assumed. Each step is transactional, so a failure leaves
	// nothing half-built.
	execFileSync(process.execPath, [MIGRATE, "provision", "--url", url], {
		cwd: resolve(here, "../.."),
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	});

	process.env.TEST_DATABASE_URL = url;
	provide("databaseUrl", url);

	return () => {
		removeContainer();
	};
}
