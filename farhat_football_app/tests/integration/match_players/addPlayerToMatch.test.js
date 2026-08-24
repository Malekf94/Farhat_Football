import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
	pool,
	resetDatabase,
	insertPlayer,
	insertHost,
	insertMatch,
	makeResponse,
} from "../helpers/seed.js";

const mod = await import("../../../Apis/match_players/controller.cjs");
const { addPlayerToMatch } = mod.default ?? mod;

// SEC-003: the roster row is written from server-held values. match_players.price
// is what the finalisation step later charges, so a price arriving in the request
// body must not reach it.
const joinRequest = (match_id, targetPlayerId, body = {}) => ({
	body: { match_id, ...body },
	targetPlayerId,
});

const storedPrice = async (match_id, player_id) => {
	const { rows } = await pool.query(
		"SELECT price FROM match_players WHERE match_id = $1 AND player_id = $2",
		[match_id, player_id],
	);
	return rows[0]?.price ?? null;
};

describe("addPlayerToMatch", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	afterAll(async () => {
		await pool.end();
	});

	it("charges the match's price, not one supplied by the caller", async () => {
		const host = await insertHost();
		const player = await insertPlayer();
		const match = await insertMatch({ host_id: host.host_id, price: 6 });
		const res = makeResponse();

		await addPlayerToMatch(
			joinRequest(match.match_id, player.player_id, { price: 0.01 }),
			res,
		);

		expect(res.statusCode).toBe(201);
		expect(await storedPrice(match.match_id, player.player_id)).toBe(6);
	});

	it("writes the match price when the request carries none at all", async () => {
		const host = await insertHost();
		const player = await insertPlayer();
		const match = await insertMatch({ host_id: host.host_id, price: 7.5 });
		const res = makeResponse();

		await addPlayerToMatch(joinRequest(match.match_id, player.player_id), res);

		expect(await storedPrice(match.match_id, player.player_id)).toBe(7.5);
	});

	it("adds the player the guard validated, not one named in the body", async () => {
		const host = await insertHost();
		const caller = await insertPlayer();
		const other = await insertPlayer();
		const match = await insertMatch({ host_id: host.host_id });
		const res = makeResponse();

		await addPlayerToMatch(
			joinRequest(match.match_id, caller.player_id, {
				player_id: other.player_id,
			}),
			res,
		);

		const { rows } = await pool.query(
			"SELECT player_id FROM match_players WHERE match_id = $1",
			[match.match_id],
		);
		expect(rows.map((r) => r.player_id)).toEqual([caller.player_id]);
	});

	it("reports an unknown match instead of writing a roster row", async () => {
		await insertHost();
		const player = await insertPlayer();
		const res = makeResponse();

		await addPlayerToMatch(joinRequest(999999, player.player_id), res);

		expect(res.statusCode).toBe(404);
		const { rows } = await pool.query("SELECT 1 FROM match_players");
		expect(rows).toHaveLength(0);
	});

	it("still refuses a player whose balance is too far overdrawn", async () => {
		const host = await insertHost();
		const player = await insertPlayer({ account_balance: -20 });
		const match = await insertMatch({ host_id: host.host_id });
		const res = makeResponse();

		await addPlayerToMatch(joinRequest(match.match_id, player.player_id), res);

		expect(res.statusCode).toBe(400);
		expect(await storedPrice(match.match_id, player.player_id)).toBeNull();
	});

	it("still refuses a player banned at the match's host", async () => {
		const host = await insertHost();
		const player = await insertPlayer();
		const match = await insertMatch({ host_id: host.host_id });
		await pool.query(
			`INSERT INTO bans (player_id, host_id, banned_until, reason, active)
			 VALUES ($1, $2, now() + interval '7 days', 'test', true)`,
			[player.player_id, host.host_id],
		);
		const res = makeResponse();

		await addPlayerToMatch(joinRequest(match.match_id, player.player_id), res);

		expect(res.statusCode).toBe(403);
		expect(await storedPrice(match.match_id, player.player_id)).toBeNull();
	});
});
