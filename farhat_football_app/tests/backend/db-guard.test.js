import { describe, it, expect } from "vitest";

// vi.mock() cannot intercept a require() inside a .cjs module, so importing any
// backend module from a test creates a real pg Pool from DATABASE_URL. This
// pins the setup-file guard that keeps that pool pointed at nothing.
describe("unit tests cannot reach a real database", () => {
	it("DATABASE_URL is the blocked sentinel, not a real connection string", () => {
		expect(process.env.DATABASE_URL).toBe(
			"postgres://blocked:blocked@127.0.0.1:1/no-db-in-unit-tests",
		);
	});

	it("a backend module that requires the pool cannot connect", async () => {
		const mod = await import("../../Apis/auth/requireHostAdmin.cjs");
		const { isHostAdmin } = mod.default ?? mod;
		// A superadmin short-circuits before any query, so this proves the module
		// loads; the rejection below proves the pool it built is inert.
		await expect(isHostAdmin({ player_id: 1, is_superadmin: true }, 99)).resolves.toBe(true);
		await expect(isHostAdmin({ player_id: 1, is_admin: true }, 99)).rejects.toThrow();
	});
});
