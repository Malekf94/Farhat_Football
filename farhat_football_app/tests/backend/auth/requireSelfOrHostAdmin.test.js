import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	makeFakePool,
	makeRes,
	reqWithEmail,
	spyNext,
} from "../helpers/fakePool.js";

// The SEC-003 guard: roster mutations carry match_id and player_id in the body,
// so this decides whether the caller may act on that target at all. Testable
// offline since TEST-002 added the injected pool.
//
// The contract worth protecting is that req.targetPlayerId — not
// req.body.player_id — is what the controllers go on to use, so an id from the
// request body never reaches a query unchecked.

const DEFAULT_HOST_ID = 1;
const OTHER_HOST_ID = 2;

const HOSTS = "FROM hosts WHERE slug";
const PLAYERS = "FROM players WHERE email";
const HOST_ADMINS = "FROM host_admins";
const MATCHES = "FROM matches WHERE match_id";

const load = async () => {
	const mod = await import("../../../Apis/auth/requireSelfOrHostAdmin.cjs");
	return mod.default ?? mod;
};

const build = async ({ player, hostAdminRows = [], matchRows = [] } = {}) => {
	const { createRequireSelfOrHostAdmin } = await load();
	const pool = makeFakePool([
		{ match: HOSTS, rows: [{ host_id: DEFAULT_HOST_ID }] },
		{ match: PLAYERS, rows: player ? [player] : [] },
		{ match: HOST_ADMINS, rows: hostAdminRows },
		{ match: MATCHES, rows: matchRows },
	]);
	return { guard: createRequireSelfOrHostAdmin(pool), pool };
};

const self = { player_id: 42, is_admin: false, is_superadmin: false };
const globalAdmin = { player_id: 2, is_admin: true, is_superadmin: false };

const bodyReq = (body) => reqWithEmail("caller@example.test", { body });

describe("requireSelfOrHostAdmin", () => {
	let next;

	beforeEach(() => {
		next = spyNext();
	});

	describe("rejecting a malformed request before it reaches the database", () => {
		it("requires a player_id", async () => {
			const { guard, pool } = await build({ player: self });
			const res = makeRes();

			await guard(bodyReq({ match_id: 5 }), res, next);

			expect(res.statusCode).toBe(400);
			expect(res.body).toEqual({ error: "player_id is required." });
			expect(pool.query).not.toHaveBeenCalled();
			expect(next).not.toHaveBeenCalled();
		});

		it("rejects a non-numeric player_id rather than coercing it", async () => {
			const { guard } = await build({ player: self });
			const res = makeRes();

			await guard(bodyReq({ player_id: "not-a-number", match_id: 5 }), res, next);

			expect(res.statusCode).toBe(400);
			expect(next).not.toHaveBeenCalled();
		});

		it("survives a request with no body at all", async () => {
			const { guard } = await build({ player: self });
			const res = makeRes();

			await guard(reqWithEmail("caller@example.test"), res, next);

			expect(res.statusCode).toBe(400);
			expect(next).not.toHaveBeenCalled();
		});
	});

	it("refuses a caller it cannot resolve from the token", async () => {
		const { guard } = await build({ player: null });
		const res = makeRes();

		await guard(bodyReq({ player_id: 42, match_id: 5 }), res, next);

		expect(res.statusCode).toBe(403);
		expect(res.body).toEqual({ error: "Could not verify identity from token." });
		expect(next).not.toHaveBeenCalled();
	});

	describe("acting on yourself", () => {
		it("admits the caller and exposes the validated target", async () => {
			const { guard } = await build({ player: self });
			const req = bodyReq({ player_id: 42, match_id: 5 });
			const res = makeRes();

			await guard(req, res, next);

			expect(next).toHaveBeenCalledOnce();
			expect(req.targetPlayerId).toBe(42);
			expect(req.player).toEqual(self);
		});

		it("does not look the match up at all", async () => {
			const { guard, pool } = await build({ player: self });

			await guard(bodyReq({ player_id: 42, match_id: 5 }), makeRes(), next);

			expect(pool.queriesMatching(MATCHES)).toHaveLength(0);
		});

		it("accepts a numeric string player_id from a JSON body", async () => {
			const { guard } = await build({ player: self });
			const req = bodyReq({ player_id: "42", match_id: "5" });

			await guard(req, makeRes(), next);

			expect(next).toHaveBeenCalledOnce();
			expect(req.targetPlayerId).toBe(42);
		});
	});

	describe("acting on someone else", () => {
		it("requires a match_id before it will consider host rights", async () => {
			const { guard } = await build({ player: globalAdmin });
			const res = makeRes();

			await guard(bodyReq({ player_id: 42 }), res, next);

			expect(res.statusCode).toBe(400);
			expect(res.body).toEqual({ error: "match_id is required." });
			expect(next).not.toHaveBeenCalled();
		});

		it("returns 404 for an unknown match", async () => {
			const { guard } = await build({ player: globalAdmin, matchRows: [] });
			const res = makeRes();

			await guard(bodyReq({ player_id: 42, match_id: 99 }), res, next);

			expect(res.statusCode).toBe(404);
			expect(next).not.toHaveBeenCalled();
		});

		it("admits an admin of the host that owns the match", async () => {
			const { guard } = await build({
				player: globalAdmin,
				matchRows: [{ host_id: DEFAULT_HOST_ID }],
			});
			const req = bodyReq({ player_id: 42, match_id: 5 });

			await guard(req, makeRes(), next);

			expect(next).toHaveBeenCalledOnce();
			expect(req.targetPlayerId).toBe(42);
			expect(req.hostId).toBe(DEFAULT_HOST_ID);
			expect(req.player).toEqual(globalAdmin);
		});

		it("refuses a global admin on a match owned by another host", async () => {
			const { guard } = await build({
				player: globalAdmin,
				matchRows: [{ host_id: OTHER_HOST_ID }],
				hostAdminRows: [],
			});
			const res = makeRes();

			await guard(bodyReq({ player_id: 42, match_id: 5 }), res, next);

			expect(res.statusCode).toBe(403);
			expect(res.body).toEqual({
				error: "You can only change your own place in a match.",
			});
			expect(next).not.toHaveBeenCalled();
		});

		it("refuses an ordinary player acting on another player", async () => {
			const { guard } = await build({
				player: { player_id: 7, is_admin: false, is_superadmin: false },
				matchRows: [{ host_id: DEFAULT_HOST_ID }],
				hostAdminRows: [],
			});
			const res = makeRes();

			await guard(bodyReq({ player_id: 42, match_id: 5 }), res, next);

			expect(res.statusCode).toBe(403);
			expect(next).not.toHaveBeenCalled();
		});

		it("looks the match up by the bound match_id, not by string interpolation", async () => {
			const { guard, pool } = await build({
				player: globalAdmin,
				matchRows: [{ host_id: DEFAULT_HOST_ID }],
			});

			await guard(bodyReq({ player_id: 42, match_id: "5" }), makeRes(), next);

			const lookups = pool.queriesMatching(MATCHES);
			expect(lookups).toHaveLength(1);
			expect(lookups[0].params).toEqual([5]);
			expect(lookups[0].text).toContain("$1");
		});
	});

	it("returns 500 rather than admitting the caller when a query fails", async () => {
		const { createRequireSelfOrHostAdmin } = await load();
		const pool = makeFakePool([
			{ match: PLAYERS, throws: new Error("connection terminated") },
		]);
		const res = makeRes();
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

		await createRequireSelfOrHostAdmin(pool)(
			bodyReq({ player_id: 42, match_id: 5 }),
			res,
			next,
		);

		expect(res.statusCode).toBe(500);
		expect(res.body).toEqual({ error: "Authorization check failed." });
		expect(next).not.toHaveBeenCalled();
		consoleError.mockRestore();
	});
});
