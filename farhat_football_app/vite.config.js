import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Use the correct base URL for your production environment
export default defineConfig({
	plugins: [react()],
	build: {
		outDir: "../dist/client", // Adjust the output directory
		emptyOutDir: true,
	},
	server: {
		proxy: {
			"/api": "http://localhost:5000", // Proxy API calls to backend during dev
		},
	},
	base: "/", // Ensure paths work correctly in production
});
