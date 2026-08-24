import { defineConfig } from "vitest/config";

// Integration tests run against a disposable PostgreSQL container and therefore
// need a live DATABASE_URL — the exact opposite of the unit suite, which pins it
// to a dead sentinel in tests/setup.js. Keeping them in a separate config is
// what lets that guard stay strict: `npm test` never loads this file, and
// vite.config.js only collects tests/frontend and tests/backend.
export default defineConfig({
	test: {
		include: ["tests/integration/**/*.test.js"],
		environment: "node",
		globalSetup: ["./tests/integration/global-setup.js"],
		setupFiles: ["./tests/integration/setup.js"],
		// One database, shared state: run files sequentially so a truncate in one
		// file cannot land in the middle of another.
		fileParallelism: false,
		testTimeout: 20_000,
		hookTimeout: 30_000,
	},
});
