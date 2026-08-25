import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	makeFakePool,
	makeIdentityPool,
	makeRes,
	reqWithEmail,
	reqWithSubject,
	spyNext,
	SQL,
} from "../helpers/fakePool.js";

// requireAdmin resolves identity through the shared AUTH-001 resolver — the
// immutable Auth0 subject — and reads the admin flags from that player's row.
//
// Since TEST-002 the module exports createRequireAdmin(pool), so the branches
// that query are testable here with a fake pool instead of needing Docker.

const load = async () => {
	const mod = await import("../../../Apis/auth/requireAdmin.cjs");
	return mod.default ?? mod;
};

const EMAIL = "caller@example.test";
const SUBJECT = `auth0|${EMAIL}`;

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
		// A token with no subject is refused before any query, which is why these
		// two can run against the production instance and its dead pool.
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

		it("refuses an unidentifiable caller on the superadmin variant too", async () => {
			const requireAdmin = await load();
			const res = makeRes();

			await requireAdmin({ superadmin: true })({ auth: {} }, res, next);

			expect(res.statusCode).toBe(403);
			expect(next).not.toHaveBeenCalled();
		});

		it("refuses a subject that is bound to nothing and carries no email", async () => {
			const { createRequireAdmin } = await load();
			const res = makeRes();

			await createRequireAdmin(makeIdentityPool([]))()(
				reqWithSubject("auth0|abc"),
				res,
				next,
			);

			expect(res.statusCode).toBe(403);
			expect(next).not.toHaveBeenCalled();
		});

		it("refuses when AUTH0_EMAIL_CLAIM is configured but absent from the payload", async () => {
			process.env.AUTH0_EMAIL_CLAIM = "https://farhatfootball.co.uk/email";
			const { createRequireAdmin } = await load();
			const res = makeRes();

			await createRequireAdmin(makeIdentityPool([]))()(
				reqWithSubject("auth0|abc"),
				res,
				next,
			);

			expect(res.statusCode).toBe(403);
			expect(next).not.toHaveBeenCalled();
		});
	});

	describe("the admin tier, against an injected pool", () => {
		const withPlayer = async (row) => {
			const { createRequireAdmin } = await load();
			const pool = makeIdentityPool(row ? [{ email: EMAIL, ...row }] : []);
			return { requireAdmin: createRequireAdmin(pool), pool };
		};

		it("admits a player whose row carries is_admin", async () => {
			const { requireAdmin } = await withPlayer({
				player_id: 7,
				is_admin: true,
				is_superadmin: false,
			});
			const req = reqWithEmail(EMAIL);
			const res = makeRes();

			await requireAdmin()(req, res, next);

			expect(next).toHaveBeenCalledOnce();
			expect(res.statusCode).toBeNull();
			expect(req.player).toMatchObject({
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

			await requireAdmin()(reqWithEmail(EMAIL), res, next);

			expect(res.statusCode).toBe(403);
			expect(res.body).toEqual({ error: "Admin access required." });
			expect(next).not.toHaveBeenCalled();
		});

		it("refuses a token whose identity matches no player row", async () => {
			const { requireAdmin } = await withPlayer(null);
			const res = makeRes();

			await requireAdmin()(reqWithEmail("ghost@example.test"), res, next);

			expect(res.statusCode).toBe(403);
			expect(res.body).toEqual({ error: "Admin access required." });
			expect(next).not.toHaveBeenCalled();
		});

		it("resolves by subject first, as a bound parameter", async () => {
			const { requireAdmin, pool } = await withPlayer({
				player_id: 9,
				is_admin: true,
			});

			await requireAdmin()(reqWithEmail(EMAIL), makeRes(), next);

			const bySubject = pool.queriesMatching(SQL.BY_SUBJECT);
			expect(bySubject.length).toBeGreaterThanOrEqual(1);
			expect(bySubject[0].params).toEqual([SUBJECT]);
			expect(bySubject[0].text).toContain("$1");
			expect(bySubject[0].text).not.toContain(SUBJECT);
		});

		it("prefers the namespaced claim over the standard email claim", async () => {
			process.env.AUTH0_EMAIL_CLAIM = "https://farhatfootball.co.uk/email";
			const { createRequireAdmin } = await load();
			const pool = makeIdentityPool([
				{ player_id: 10, email: "namespaced@example.test", is_admin: true },
			]);
			const req = {
				auth: {
					payload: {
						sub: "auth0|ns",
						email: "standard@example.test",
						"https://farhatfootball.co.uk/email": "namespaced@example.test",
					},
				},
			};

			await createRequireAdmin(pool)()(req, makeRes(), next);

			expect(next).toHaveBeenCalledOnce();
			expect(pool.queriesMatching(SQL.BY_EMAIL)[0].params).toEqual([
				"namespaced@example.test",
			]);
		});

		it("returns 500 rather than admitting the caller when the lookup fails", async () => {
			const { createRequireAdmin } = await load();
			const pool = makeFakePool([
				{ match: SQL.BY_SUBJECT, throws: new Error("connection terminated") },
			]);
			const res = makeRes();
			const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

			await createRequireAdmin(pool)()(reqWithEmail(EMAIL), res, next);

			expect(res.statusCode).toBe(500);
			expect(res.body).toEqual({ error: "Authorization check failed." });
			expect(next).not.toHaveBeenCalled();
			consoleError.mockRestore();
		});
	});

	describe("the superadmin tier, against an injected pool", () => {
		const withPlayer = async (row) => {
			const { createRequireAdmin } = await load();
			return createRequireAdmin(makeIdentityPool([{ email: EMAIL, ...row }]));
		};

		it("admits a superadmin", async () => {
			const requireAdmin = await withPlayer({
				player_id: 1,
				is_admin: true,
				is_superadmin: true,
			});
			const res = makeRes();

			await requireAdmin({ superadmin: true })(reqWithEmail(EMAIL), res, next);

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

			await requireAdmin({ superadmin: true })(reqWithEmail(EMAIL), res, next);

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

			await requireAdmin()(reqWithEmail(EMAIL), res, next);

			expect(res.statusCode).toBe(403);
			expect(next).not.toHaveBeenCalled();
		});
	});

	describe("identity refusals surfaced by the resolver", () => {
		it("refuses a caller whose tenant reports the email as unverified", async () => {
			const { createRequireAdmin } = await load();
			const pool = makeIdentityPool([
				{ player_id: 4, email: EMAIL, is_admin: true },
			]);
			const req = reqWithSubject("auth0|new", {
				email: EMAIL,
				email_verified: false,
			});
			const res = makeRes();

			await createRequireAdmin(pool)()(req, res, next);

			expect(res.statusCode).toBe(403);
			expect(res.body).toEqual({ error: "Email address is not verified." });
			expect(next).not.toHaveBeenCalled();
			expect(pool.rows[0].auth0_sub).toBeNull();
		});

		it("refuses a caller whose email matches more than one row", async () => {
			const { createRequireAdmin } = await load();
			const pool = makeIdentityPool([
				{ player_id: 5, email: "Dup@example.test", is_admin: true },
				{ player_id: 6, email: "dup@example.test", is_admin: false },
			]);
			const res = makeRes();

			await createRequireAdmin(pool)()(
				reqWithEmail("dup@example.test"),
				res,
				next,
			);

			expect(res.statusCode).toBe(403);
			expect(res.body).toEqual({
				error: "Account could not be identified uniquely.",
			});
			expect(next).not.toHaveBeenCalled();
		});
	});
});
