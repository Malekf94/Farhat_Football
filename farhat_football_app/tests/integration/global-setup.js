import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
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
const SCHEMA = resolve(here, "../../../schema.sql");

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

// schema.sql was produced by pg_dump 17.1 against a 16.13 server
// (schema.sql:4-5), so it emits SET directives for parameters that exist only
// in PostgreSQL 17. Under ON_ERROR_STOP those abort the entire load. Strip them
// at load time rather than editing the tracked dump — reconciling that file is
// DB-001's job, not this harness's.
const PG17_ONLY_SETTINGS = /^SET\s+transaction_timeout\b/;

const loadableSchema = () =>
	readFileSync(SCHEMA, "utf8")
		.split(/\r?\n/)
		.filter((line) => !PG17_ONLY_SETTINGS.test(line))
		.join("\n");

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

	// ON_ERROR_STOP makes a failed schema load fail the run instead of leaving
	// tests to fail one by one against a half-built database.
	docker(
		[
			"exec",
			"--interactive",
			CONTAINER,
			"psql",
			"--host",
			"127.0.0.1",
			"--username",
			USER,
			"--dbname",
			DB,
			"--set",
			"ON_ERROR_STOP=1",
			"--quiet",
			"--file",
			"-",
		],
		{ input: loadableSchema(), stdio: ["pipe", "pipe", "pipe"] },
	);

	const mapping = docker(["port", CONTAINER, "5432/tcp"]).trim().split("\n")[0];
	const port = mapping.slice(mapping.lastIndexOf(":") + 1);
	const url = `postgres://${USER}:${PASSWORD}@127.0.0.1:${port}/${DB}`;

	process.env.TEST_DATABASE_URL = url;
	provide("databaseUrl", url);

	return () => {
		removeContainer();
	};
}
