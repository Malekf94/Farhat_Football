import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import {
	pool,
	resetDatabase,
	insertPlayer,
	requestFor,
	makeResponse,
} from "../helpers/seed.js";

// requireAdmin() is the guard SEC-004 puts in front of the payment dashboard,
// and the same guard already protecting /refund, /audit and /reconcile. Its
// decision depends on flags read from the database, so the unit suite can only
// reach the no-email branch; these cases are the actual authorization tiers.
const mod = await import("../../../Apis/auth/requireAdmin.cjs");
const requireAdmin = mod.default ?? mod;

describe("requireAdmin against a real database", () => {
	let next;

	beforeEach(async () => {
		next = vi.fn();
		delete process.env.AUTH0_EMAIL_CLAIM;
		await resetDatabase();
	});

	afterAll(async () => {
		await pool.end();
	});

	it("refuses a player who holds no admin flag", async () => {
		const player = await insertPlayer({ is_admin: false });
		const res = makeResponse();

		await requireAdmin()(requestFor(player.email), res, next);

		expect(res.statusCode).toBe(403);
		expect(res.body).toEqual({ error: "Admin access required." });
		expect(next).not.toHaveBeenCalled();
	});

	it("admits a global admin and exposes the verified caller downstream", async () => {
		const player = await insertPlayer({ is_admin: true });
		const req = requestFor(player.email);
		const res = makeResponse();

		await requireAdmin()(req, res, next);

		expect(next).toHaveBeenCalledTimes(1);
		expect(res.statusCode).toBeNull();
		expect(req.player.player_id).toBe(player.player_id);
	});

	it("refuses a token whose email matches no player row", async () => {
		await insertPlayer({ is_admin: true });
		const res = makeResponse();

		await requireAdmin()(requestFor("nobody@example.test"), res, next);

		expect(res.statusCode).toBe(403);
		expect(next).not.toHaveBeenCalled();
	});

	it("refuses a global admin on the superadmin variant", async () => {
		const player = await insertPlayer({ is_admin: true, is_superadmin: false });
		const res = makeResponse();

		await requireAdmin({ superadmin: true })(requestFor(player.email), res, next);

		expect(res.statusCode).toBe(403);
		expect(next).not.toHaveBeenCalled();
	});

	it("admits a superadmin on the superadmin variant", async () => {
		const player = await insertPlayer({ is_admin: true, is_superadmin: true });
		const res = makeResponse();

		await requireAdmin({ superadmin: true })(requestFor(player.email), res, next);

		expect(next).toHaveBeenCalledTimes(1);
		expect(res.statusCode).toBeNull();
	});

	it("resolves identity from AUTH0_EMAIL_CLAIM when the tenant namespaces it", async () => {
		const claim = "https://farhatfootball.co.uk/email";
		process.env.AUTH0_EMAIL_CLAIM = claim;
		const player = await insertPlayer({ is_admin: true });
		const req = { auth: { payload: { sub: "auth0|x", [claim]: player.email } } };
		const res = makeResponse();

		await requireAdmin()(req, res, next);

		expect(next).toHaveBeenCalledTimes(1);
		expect(req.player.player_id).toBe(player.player_id);
	});

	it("ignores an admin flag supplied by the caller rather than the database", async () => {
		const player = await insertPlayer({ is_admin: false });
		const res = makeResponse();
		const req = requestFor(player.email, {
			body: { is_admin: true, is_superadmin: true, player_id: player.player_id },
		});

		await requireAdmin()(req, res, next);

		expect(res.statusCode).toBe(403);
		expect(next).not.toHaveBeenCalled();
	});
});
