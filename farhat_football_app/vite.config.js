import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Use the correct base URL for your production environment
export default defineConfig({
	plugins: [react()],
	build: {
		outDir: "./dist/client", // Adjust the output directory
		emptyOutDir: true,
	},
	server: {
		proxy: {
			"/api": "http://localhost:3000", // Proxy API calls to backend during dev
		},
	},
	base: "/", // Ensure paths work correctly in production
	test: {
		// Frontend tests are .test.jsx next to their subject; backend tests are
		// .test.js next to the .cjs module they import.
		// All tests live under tests/, mirroring the source tree in
		// tests/frontend/** and tests/backend/**.
		// tests/integration/** is deliberately NOT collected here: it needs a live
		// DATABASE_URL and runs from vitest.integration.config.js instead.
		include: [
			"tests/frontend/**/*.test.{js,jsx}",
			"tests/backend/**/*.test.{js,jsx}",
		],
		environment: "node",
		setupFiles: ["./tests/setup.js"],
	},
});
