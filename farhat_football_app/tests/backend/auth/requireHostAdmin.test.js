import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	makeFakePool,
	makeIdentityPool,
	makeRes,
	reqWithEmail,
	spyNext,
	SQL,
} from "../helpers/fakePool.js";

// TEST-002 made this module injectable, so the host-scoping tiers are testable
// offline. The asymmetry is the part that is easy to get wrong and silent when
// it is: a superadmin is admin everywhere, a global is_admin is admin of the
// DEFAULT host only, and every other host needs an explicit host_admins row.

const DEFAULT_HOST_ID = 1;
const OTHER_HOST_ID = 2;

const HOSTS = "FROM hosts WHERE slug";
const HOST_ADMINS = "FROM host_admins";
const MATCHES = "FROM matches WHERE match_id";

const EMAIL = "caller@example.test";

const load = async () => {
	const mod = await import("../../../Apis/auth/requireHostAdmin.cjs");
	return mod.default ?? mod;
};

// Each call builds a fresh instance, so the default-host id cached inside one
// test cannot answer for the next. The pool models the AUTH-001 identity
// statements as well as the host tables, because getCaller now resolves through
// the shared resolver rather than querying by email itself.
const build = async ({ player, hostAdminRows = [], matchRows = [], hosts } = {}) => {
	const { createHostAdminAuth } = await load();
	const pool = makeIdentityPool(player ? [{ email: EMAIL, ...player }] : [], [
		{ match: HOSTS, rows: hosts ?? [{ host_id: DEFAULT_HOST_ID }] },
		{ match: HOST_ADMINS, rows: hostAdminRows },
		{ match: MATCHES, rows: matchRows },
	]);
	return { ...createHostAdminAuth(pool), pool };
};

const superadmin = { player_id: 1, is_admin: true, is_superadmin: true };
const globalAdmin = { player_id: 2, is_admin: true, is_superadmin: false };
const ordinary = { player_id: 3, is_admin: false, is_superadmin: false };

describe("isHostAdmin", () => {
	it("refuses a caller that could not be resolved", async () => {
		const { isHostAdmin } = await build();
		expect(await isHostAdmin(null, DEFAULT_HOST_ID)).toBe(false);
	});

	it("admits a superadmin at any host, without querying at all", async () => {
		const { isHostAdmin, pool } = await build();

		expect(await isHostAdmin(superadmin, OTHER_HOST_ID)).toBe(true);
		expect(pool.query).not.toHaveBeenCalled();
	});

	it("admits a global admin at the default host", async () => {
		const { isHostAdmin } = await build();
		expect(await isHostAdmin(globalAdmin, DEFAULT_HOST_ID)).toBe(true);
	});

	it("refuses a global admin at another host with no host_admins row", async () => {
		const { isHostAdmin } = await build({ hostAdminRows: [] });
		expect(await isHostAdmin(globalAdmin, OTHER_HOST_ID)).toBe(false);
	});

	it("admits a global admin at another host when a host_admins row exists", async () => {
		const { isHostAdmin } = await build({ hostAdminRows: [{ "?column?": 1 }] });
		expect(await isHostAdmin(globalAdmin, OTHER_HOST_ID)).toBe(true);
	});

	it("admits an ordinary player at a host they explicitly administer", async () => {
		const { isHostAdmin, pool } = await build({
			hostAdminRows: [{ "?column?": 1 }],
		});

		expect(await isHostAdmin(ordinary, OTHER_HOST_ID)).toBe(true);
		expect(pool.queriesMatching(HOST_ADMINS)[0].params).toEqual([
			OTHER_HOST_ID,
			ordinary.player_id,
		]);
	});

	it("refuses an ordinary player at a host they do not administer", async () => {
		const { isHostAdmin } = await build({ hostAdminRows: [] });
		expect(await isHostAdmin(ordinary, OTHER_HOST_ID)).toBe(false);
	});

	it("refuses a non-superadmin when the host is unknown", async () => {
		const { isHostAdmin, pool } = await build();

		expect(await isHostAdmin(globalAdmin, null)).toBe(false);
		expect(pool.queriesMatching(HOST_ADMINS)).toHaveLength(0);
	});

	// If the default-host slug resolves to nothing, a global admin must not be
	// silently promoted to admin-of-everywhere by a null == null comparison.
	it("refuses a global admin everywhere when the default host slug matches no row", async () => {
		const { isHostAdmin } = await build({ hosts: [], hostAdminRows: [] });

		expect(await isHostAdmin(globalAdmin, DEFAULT_HOST_ID)).toBe(false);
		expect(await isHostAdmin(globalAdmin, null)).toBe(false);
	});
});

describe("getDefaultHostId", () => {
	it("resolves the id once and caches it for the instance", async () => {
		const { getDefaultHostId, pool } = await build();

		expect(await getDefaultHostId()).toBe(DEFAULT_HOST_ID);
		expect(await getDefaultHostId()).toBe(DEFAULT_HOST_ID);
		expect(pool.queriesMatching(HOSTS)).toHaveLength(1);
	});

	it("caches a missing default host too, rather than re-querying every call", async () => {
		const { getDefaultHostId, pool } = await build({ hosts: [] });

		expect(await getDefaultHostId()).toBeNull();
		expect(await getDefaultHostId()).toBeNull();
		expect(pool.queriesMatching(HOSTS)).toHaveLength(1);
	});

	it("does not share its cache between instances", async () => {
		const first = await build({ hosts: [{ host_id: 41 }] });
		const second = await build({ hosts: [{ host_id: 42 }] });

		expect(await first.getDefaultHostId()).toBe(41);
		expect(await second.getDefaultHostId()).toBe(42);
	});
});

describe("getCaller", () => {
	it("returns null without querying when the token carries no subject", async () => {
		const { getCaller, pool } = await build({ player: globalAdmin });

		expect(await getCaller({ auth: { payload: {} } })).toBeNull();
		expect(pool.query).not.toHaveBeenCalled();
	});

	it("returns null when the identity matches no player", async () => {
		const { getCaller } = await build({ player: null });
		expect(await getCaller(reqWithEmail("ghost@example.test"))).toBeNull();
	});

	it("returns the player row for a known identity", async () => {
		const { getCaller } = await build({ player: globalAdmin });
		expect(await getCaller(reqWithEmail(EMAIL))).toMatchObject(globalAdmin);
	});
});

describe("requireHostAdmin", () => {
	let next;

	beforeEach(() => {
		next = spyNext();
	});

	it("refuses a caller it cannot resolve from the token", async () => {
		const { requireHostAdmin } = await build({ player: null });
		const res = makeRes();

		await requireHostAdmin()(reqWithEmail("ghost@example.test"), res, next);

		expect(res.statusCode).toBe(403);
		expect(res.body).toEqual({ error: "Could not verify identity from token." });
		expect(next).not.toHaveBeenCalled();
	});

	it("returns 404 when the match in the path does not exist", async () => {
		const { requireHostAdmin } = await build({
			player: globalAdmin,
			matchRows: [],
		});
		const res = makeRes();
		const req = reqWithEmail(EMAIL, { params: { match_id: "99" } });

		await requireHostAdmin()(req, res, next);

		expect(res.statusCode).toBe(404);
		expect(next).not.toHaveBeenCalled();
	});

	it("admits an admin of the host that owns the match, exposing the host on the request", async () => {
		const { requireHostAdmin } = await build({
			player: globalAdmin,
			matchRows: [{ host_id: DEFAULT_HOST_ID }],
		});
		const res = makeRes();
		const req = reqWithEmail(EMAIL, { params: { match_id: "5" } });

		await requireHostAdmin()(req, res, next);

		expect(next).toHaveBeenCalledOnce();
		expect(req.hostId).toBe(DEFAULT_HOST_ID);
		expect(req.player).toMatchObject(globalAdmin);
	});

	it("refuses a global admin acting on a match owned by another host", async () => {
		const { requireHostAdmin } = await build({
			player: globalAdmin,
			matchRows: [{ host_id: OTHER_HOST_ID }],
			hostAdminRows: [],
		});
		const res = makeRes();
		const req = reqWithEmail(EMAIL, { params: { match_id: "5" } });

		await requireHostAdmin()(req, res, next);

		expect(res.statusCode).toBe(403);
		expect(res.body).toEqual({ error: "You are not an admin of this host." });
		expect(next).not.toHaveBeenCalled();
	});

	it("takes the host from the body and normalises it to a number", async () => {
		const { requireHostAdmin } = await build({
			player: superadmin,
			matchRows: [],
		});
		const req = reqWithEmail(EMAIL, {
			body: { host_id: "2" },
		});

		await requireHostAdmin({ source: "body" })(req, makeRes(), next);

		expect(next).toHaveBeenCalledOnce();
		expect(req.body.host_id).toBe(OTHER_HOST_ID);
		expect(req.hostId).toBe(OTHER_HOST_ID);
	});

	it("falls back to the default host when the body carries no host_id", async () => {
		const { requireHostAdmin } = await build({ player: globalAdmin });
		const req = reqWithEmail(EMAIL, { body: {} });

		await requireHostAdmin({ source: "body" })(req, makeRes(), next);

		expect(next).toHaveBeenCalledOnce();
		expect(req.body.host_id).toBe(DEFAULT_HOST_ID);
	});

	it("returns 500 rather than admitting the caller when a query fails", async () => {
		const { createHostAdminAuth } = await load();
		const pool = makeFakePool([
			{ match: SQL.BY_SUBJECT, throws: new Error("connection terminated") },
		]);
		const res = makeRes();
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

		await createHostAdminAuth(pool).requireHostAdmin()(
			reqWithEmail(EMAIL, { params: { match_id: "5" } }),
			res,
			next,
		);

		expect(res.statusCode).toBe(500);
		expect(res.body).toEqual({ error: "Authorization check failed." });
		expect(next).not.toHaveBeenCalled();
		consoleError.mockRestore();
	});
});
