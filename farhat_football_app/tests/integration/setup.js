// Integration counterpart to tests/setup.js. That file pins DATABASE_URL to a
// dead sentinel so a unit test can never reach a database; these tests need the
// opposite, so they live under their own config and their own setup file. The
// unit guard is untouched and still applies to everything under tests/backend
// and tests/frontend.
//
// The URL points at the disposable container created by global-setup.js, and is
// only ever a container on loopback — never a real deployment.
const url = process.env.TEST_DATABASE_URL;

if (!url) {
	throw new Error(
		"TEST_DATABASE_URL is unset. Integration tests must run through vitest.integration.config.js, which starts the container.",
	);
}

process.env.DATABASE_URL = url;
