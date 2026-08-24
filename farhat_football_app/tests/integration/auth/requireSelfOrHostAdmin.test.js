import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import {
	pool,
	resetDatabase,
	insertPlayer,
	insertHost,
	insertMatch,
	makeHostAdmin,
	requestFor,
	makeResponse,
	DEFAULT_HOST_SLUG,
} from "../helpers/seed.js";

// SEC-003: joining or removing a player is bound to the authenticated subject.
// A caller may act on themselves; acting on anyone else needs admin rights over
// the host that owns the match.
const mod = await import("../../../Apis/auth/requireSelfOrHostAdmin.cjs");
const requireSelfOrHostAdmin = mod.default ?? mod;

// requireHostAdmin.cjs memoises the default host id at module scope, and
// vi.resetModules() does not clear Node's require cache for a .cjs module. The
// default host is therefore inserted first after every truncate: RESTART
// IDENTITY resets the sequence, so it always lands on the same id and the
// memoised value stays true. Insert it first or these tests lie.
const seedDefaultHostFirst = () =>
	insertHost({ name: "Default", slug: DEFAULT_HOST_SLUG });

const call = (guard, req) => {
	const res = makeResponse();
	const next = vi.fn();
	return guard(req, res, next).then(() => ({ res, next }));
};

describe("requireSelfOrHostAdmin", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	afterAll(async () => {
		await pool.end();
	});

	it("lets a player act on their own place in a match", async () => {
		const defaultHost = await seedDefaultHostFirst();
		const player = await insertPlayer();
		const match = await insertMatch({ host_id: defaultHost.host_id });
		const req = requestFor(player.email, {
			body: { match_id: match.match_id, player_id: player.player_id },
		});

		const { res, next } = await call(requireSelfOrHostAdmin, req);

		expect(next).toHaveBeenCalledTimes(1);
		expect(res.statusCode).toBeNull();
		expect(req.targetPlayerId).toBe(player.player_id);
	});

	it("refuses a player acting on somebody else", async () => {
		const defaultHost = await seedDefaultHostFirst();
		const caller = await insertPlayer();
		const victim = await insertPlayer();
		const match = await insertMatch({ host_id: defaultHost.host_id });

		const { res, next } = await call(
			requireSelfOrHostAdmin,
			requestFor(caller.email, {
				body: { match_id: match.match_id, player_id: victim.player_id },
			}),
		);

		expect(res.statusCode).toBe(403);
		expect(next).not.toHaveBeenCalled();
	});

	it("lets a host admin act on another player at their own host", async () => {
		await seedDefaultHostFirst();
		const otherHost = await insertHost({ slug: "other" });
		const admin = await insertPlayer();
		const victim = await insertPlayer();
		await makeHostAdmin(otherHost.host_id, admin.player_id);
		const match = await insertMatch({ host_id: otherHost.host_id });

		const { res, next } = await call(
			requireSelfOrHostAdmin,
			requestFor(admin.email, {
				body: { match_id: match.match_id, player_id: victim.player_id },
			}),
		);

		expect(next).toHaveBeenCalledTimes(1);
		expect(res.statusCode).toBeNull();
	});

	it("refuses a host admin acting at a host they do not administer", async () => {
		await seedDefaultHostFirst();
		const theirHost = await insertHost({ slug: "theirs" });
		const otherHost = await insertHost({ slug: "not-theirs" });
		const admin = await insertPlayer();
		const victim = await insertPlayer();
		await makeHostAdmin(theirHost.host_id, admin.player_id);
		const match = await insertMatch({ host_id: otherHost.host_id });

		const { res, next } = await call(
			requireSelfOrHostAdmin,
			requestFor(admin.email, {
				body: { match_id: match.match_id, player_id: victim.player_id },
			}),
		);

		expect(res.statusCode).toBe(403);
		expect(next).not.toHaveBeenCalled();
	});

	it("lets a global admin act at the default host", async () => {
		const defaultHost = await seedDefaultHostFirst();
		const admin = await insertPlayer({ is_admin: true });
		const victim = await insertPlayer();
		const match = await insertMatch({ host_id: defaultHost.host_id });

		const { res, next } = await call(
			requireSelfOrHostAdmin,
			requestFor(admin.email, {
				body: { match_id: match.match_id, player_id: victim.player_id },
			}),
		);

		expect(next).toHaveBeenCalledTimes(1);
		expect(res.statusCode).toBeNull();
	});

	it("refuses a global admin at a host that is not the default one", async () => {
		await seedDefaultHostFirst();
		const otherHost = await insertHost({ slug: "elsewhere" });
		const admin = await insertPlayer({ is_admin: true });
		const victim = await insertPlayer();
		const match = await insertMatch({ host_id: otherHost.host_id });

		const { res, next } = await call(
			requireSelfOrHostAdmin,
			requestFor(admin.email, {
				body: { match_id: match.match_id, player_id: victim.player_id },
			}),
		);

		expect(res.statusCode).toBe(403);
		expect(next).not.toHaveBeenCalled();
	});

	it("lets a superadmin act at any host", async () => {
		await seedDefaultHostFirst();
		const otherHost = await insertHost({ slug: "anywhere" });
		const admin = await insertPlayer({ is_superadmin: true });
		const victim = await insertPlayer();
		const match = await insertMatch({ host_id: otherHost.host_id });

		const { res, next } = await call(
			requireSelfOrHostAdmin,
			requestFor(admin.email, {
				body: { match_id: match.match_id, player_id: victim.player_id },
			}),
		);

		expect(next).toHaveBeenCalledTimes(1);
		expect(res.statusCode).toBeNull();
	});

	it("refuses a token whose email matches no player", async () => {
		const defaultHost = await seedDefaultHostFirst();
		const victim = await insertPlayer();
		const match = await insertMatch({ host_id: defaultHost.host_id });

		const { res, next } = await call(
			requireSelfOrHostAdmin,
			requestFor("stranger@example.test", {
				body: { match_id: match.match_id, player_id: victim.player_id },
			}),
		);

		expect(res.statusCode).toBe(403);
		expect(next).not.toHaveBeenCalled();
	});

	it("rejects a request with no player_id", async () => {
		const defaultHost = await seedDefaultHostFirst();
		const player = await insertPlayer();
		const match = await insertMatch({ host_id: defaultHost.host_id });

		const { res, next } = await call(
			requireSelfOrHostAdmin,
			requestFor(player.email, { body: { match_id: match.match_id } }),
		);

		expect(res.statusCode).toBe(400);
		expect(next).not.toHaveBeenCalled();
	});

	it("reports an unknown match rather than authorising against it", async () => {
		await seedDefaultHostFirst();
		const caller = await insertPlayer({ is_superadmin: true });
		const victim = await insertPlayer();

		const { res, next } = await call(
			requireSelfOrHostAdmin,
			requestFor(caller.email, {
				body: { match_id: 999999, player_id: victim.player_id },
			}),
		);

		expect(res.statusCode).toBe(404);
		expect(next).not.toHaveBeenCalled();
	});
});
