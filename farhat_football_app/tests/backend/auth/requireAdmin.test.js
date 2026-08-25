import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	makeFakePool,
	makeRes,
	reqWithEmail,
	spyNext,
} from "../helpers/fakePool.js";

// requireAdmin resolves identity from the verified token and reads the admin
// flags from the database.
//
// Since TEST-002 the module exports createRequireAdmin(pool), so the branches
// that query are testable here with a fake pool instead of needing Docker. The
// early-refusal cases below still return before any lookup; the matrix after
// them drives the full admin/superadmin tiering offline.

const load = async () => {
	const mod = await import("../../../Apis/auth/requireAdmin.cjs");
	return mod.default ?? mod;
};

const PLAYER_LOOKUP = "FROM players WHERE email";

describe("requireAdmin", () => {
	let next;
	const originalClaim = process.env.AUTH0_EMAIL_CLAIM;

	beforeEach(() => {
		next = spyNext();
		delete process.env.AUTH0_EMAIL_CLAIM;
	});

	afterEach(() => {
		if (originalClaim === undefined) {
			delete process.env.AUTH0_EMAIL_CLAIM;
		} else {
			process.env.AUTH0_EMAIL_CLAIM = originalClaim;
		}
	});

	describe("refusing a caller it cannot identify", () => {
		it("refuses a request with no verified token at all", async () => {
			const requireAdmin = await load();
			const res = makeRes();

			await requireAdmin()({}, res, next);

			expect(res.statusCode).toBe(403);
			expect(res.body).toEqual({
				error: "Could not verify identity from token.",
			});
			expect(next).not.toHaveBeenCalled();
		});

		it("refuses a verified token whose payload carries no email claim", async () => {
			const requireAdmin = await load();
			const res = makeRes();

			await requireAdmin()({ auth: { payload: { sub: "auth0|abc" } } }, res, next);

			expect(res.statusCode).toBe(403);
			expect(next).not.toHaveBeenCalled();
		});

		it("refuses when AUTH0_EMAIL_CLAIM is configured but absent from the payload", async () => {
			process.env.AUTH0_EMAIL_CLAIM = "https://farhatfootball.co.uk/email";
			const requireAdmin = await load();
			const res = makeRes();

			await requireAdmin()({ auth: { payload: { sub: "auth0|abc" } } }, res, next);

			expect(res.statusCode).toBe(403);
			expect(next).not.toHaveBeenCalled();
		});

		it("refuses an unidentifiable caller on the superadmin variant too", async () => {
			const requireAdmin = await load();
			const res = makeRes();

			await requireAdmin({ superadmin: true })({ auth: {} }, res, next);

			expect(res.statusCode).toBe(403);
			expect(next).not.toHaveBeenCalled();
		});
	});

	describe("the admin tier, against an injected pool", () => {
		const withPlayer = async (row) => {
			const { createRequireAdmin } = await load();
			const pool = makeFakePool([
				{ match: PLAYER_LOOKUP, rows: row ? [row] : [] },
			]);
			return { requireAdmin: createRequireAdmin(pool), pool };
		};

		it("admits a player whose row carries is_admin", async () => {
			const { requireAdmin } = await withPlayer({
				player_id: 7,
				is_admin: true,
				is_superadmin: false,
			});
			const req = reqWithEmail("admin@example.test");
			const res = makeRes();

			await requireAdmin()(req, res, next);

			expect(next).toHaveBeenCalledOnce();
			expect(res.statusCode).toBeNull();
			expect(req.player).toEqual({
				player_id: 7,
				is_admin: true,
				is_superadmin: false,
			});
		});

		it("refuses a real player who is not an admin", async () => {
			const { requireAdmin } = await withPlayer({
				player_id: 8,
				is_admin: false,
				is_superadmin: false,
			});
			const res = makeRes();

			await requireAdmin()(reqWithEmail("player@example.test"), res, next);

			expect(res.statusCode).toBe(403);
			expect(res.body).toEqual({ error: "Admin access required." });
			expect(next).not.toHaveBeenCalled();
		});

		it("refuses a token whose email matches no player row", async () => {
			const { requireAdmin } = await withPlayer(null);
			const res = makeRes();

			await requireAdmin()(reqWithEmail("ghost@example.test"), res, next);

			expect(res.statusCode).toBe(403);
			expect(res.body).toEqual({ error: "Admin access required." });
			expect(next).not.toHaveBeenCalled();
		});

		it("looks the caller up by the token email, passed as a bound parameter", async () => {
			const { requireAdmin, pool } = await withPlayer({
				player_id: 9,
				is_admin: true,
			});

			await requireAdmin()(reqWithEmail("caller@example.test"), makeRes(), next);

			const lookups = pool.queriesMatching(PLAYER_LOOKUP);
			expect(lookups).toHaveLength(1);
			expect(lookups[0].params).toEqual(["caller@example.test"]);
			expect(lookups[0].text).toContain("$1");
			expect(lookups[0].text).not.toContain("caller@example.test");
		});

		it("prefers the namespaced claim over the standard email claim", async () => {
			process.env.AUTH0_EMAIL_CLAIM = "https://farhatfootball.co.uk/email";
			const { createRequireAdmin } = await load();
			const pool = makeFakePool([
				{ match: PLAYER_LOOKUP, rows: [{ player_id: 10, is_admin: true }] },
			]);
			const req = {
				auth: {
					payload: {
						email: "standard@example.test",
						"https://farhatfootball.co.uk/email": "namespaced@example.test",
					},
				},
			};

			await createRequireAdmin(pool)()(req, makeRes(), next);

			expect(pool.queriesMatching(PLAYER_LOOKUP)[0].params).toEqual([
				"namespaced@example.test",
			]);
		});

		it("returns 500 rather than admitting the caller when the lookup fails", async () => {
			const { createRequireAdmin } = await load();
			const pool = makeFakePool([
				{ match: PLAYER_LOOKUP, throws: new Error("connection terminated") },
			]);
			const res = makeRes();
			const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

			await createRequireAdmin(pool)()(
				reqWithEmail("admin@example.test"),
				res,
				next,
			);

			expect(res.statusCode).toBe(500);
			expect(res.body).toEqual({ error: "Authorization check failed." });
			expect(next).not.toHaveBeenCalled();
			consoleError.mockRestore();
		});
	});

	describe("the superadmin tier, against an injected pool", () => {
		const withPlayer = async (row) => {
			const { createRequireAdmin } = await load();
			const pool = makeFakePool([{ match: PLAYER_LOOKUP, rows: [row] }]);
			return createRequireAdmin(pool);
		};

		it("admits a superadmin", async () => {
			const requireAdmin = await withPlayer({
				player_id: 1,
				is_admin: true,
				is_superadmin: true,
			});
			const res = makeRes();

			await requireAdmin({ superadmin: true })(
				reqWithEmail("super@example.test"),
				res,
				next,
			);

			expect(next).toHaveBeenCalledOnce();
			expect(res.statusCode).toBeNull();
		});

		it("refuses a global admin who is not a superadmin", async () => {
			const requireAdmin = await withPlayer({
				player_id: 2,
				is_admin: true,
				is_superadmin: false,
			});
			const res = makeRes();

			await requireAdmin({ superadmin: true })(
				reqWithEmail("admin@example.test"),
				res,
				next,
			);

			expect(res.statusCode).toBe(403);
			expect(next).not.toHaveBeenCalled();
		});

		// Inferred from the implementation, not from a stated requirement: the two
		// flags are read independently, so a superadmin whose row has is_admin
		// false is refused by the plain admin variant. In practice superadmins
		// carry both flags. Pinned so that a change to the tiering is a decision
		// rather than an accident.
		it("does not treat is_superadmin as implying is_admin", async () => {
			const requireAdmin = await withPlayer({
				player_id: 3,
				is_admin: false,
				is_superadmin: true,
			});
			const res = makeRes();

			await requireAdmin()(reqWithEmail("super@example.test"), res, next);

			expect(res.statusCode).toBe(403);
			expect(next).not.toHaveBeenCalled();
		});
	});
});
