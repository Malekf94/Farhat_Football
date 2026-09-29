import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
	pool,
	resetDatabase,
	insertPlayer,
	insertHost,
	insertMatch,
	makeResponse,
} from "../helpers/seed.js";

const matchPlayers = await import("../../../Apis/match_players/controller.cjs");
const { addPlayerToMatch } = matchPlayers.default ?? matchPlayers;
const payments = await import("../../../Apis/payments/controller.cjs");
const { leavingPayment } = payments.default ?? payments;
const matches = await import("../../../Apis/matches/controller.cjs");
const { deleteMatch } = matches.default ?? matches;

// Migration 0003: every roster join and leave is recorded in
// match_player_events by a trigger on match_players, so "when did X leave?"
// is answerable even when the leave was early enough not to be charged.

const hoursFromNow = (hours) => {
	const at = new Date(Date.now() + hours * 60 * 60 * 1000);
	return {
		match_date: at.toISOString().slice(0, 10),
		match_time: at.toISOString().slice(11, 19),
	};
};

const rosterRequest = (match_id, targetPlayerId) => ({
	body: { match_id },
	targetPlayerId,
});

const eventsFor = async (match_id) => {
	const { rows } = await pool.query(
		`SELECT player_id, event, team_id, occurred_at
		 FROM match_player_events
		 WHERE match_id = $1
		 ORDER BY event_id`,
		[match_id],
	);
	return rows;
};

describe("match_player_events", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	afterAll(async () => {
		await pool.end();
	});

	it("records a join, with the team the player joined on", async () => {
		const host = await insertHost();
		const player = await insertPlayer();
		const match = await insertMatch({ host_id: host.host_id, ...hoursFromNow(48) });
		const res = makeResponse();

		await addPlayerToMatch(rosterRequest(match.match_id, player.player_id), res);

		expect(res.statusCode).toBe(201);
		const events = await eventsFor(match.match_id);
		expect(events).toHaveLength(1);
		expect(events[0]).toMatchObject({
			player_id: player.player_id,
			event: "joined",
			team_id: 0,
		});
	});

	it("records an early, uncharged leave — the case that left no trace before", async () => {
		const host = await insertHost();
		const player = await insertPlayer();
		const match = await insertMatch({ host_id: host.host_id, ...hoursFromNow(48) });
		await addPlayerToMatch(rosterRequest(match.match_id, player.player_id), makeResponse());

		const before = Date.now();
		const res = makeResponse();
		await leavingPayment(rosterRequest(match.match_id, player.player_id), res);

		expect(res.statusCode).toBe(200);
		expect(res.body.charged).toBe(false);
		const events = await eventsFor(match.match_id);
		expect(events.map((e) => e.event)).toEqual(["joined", "left"]);

		// timestamptz: the recorded instant is the real moment of leaving, so it
		// compares directly against the JS clock with no timezone arithmetic.
		const leftAt = events[1].occurred_at.getTime();
		expect(leftAt).toBeGreaterThanOrEqual(before - 5_000);
		expect(leftAt).toBeLessThanOrEqual(Date.now() + 5_000);
	});

	it("records nothing when a join is refused", async () => {
		const host = await insertHost();
		const broke = await insertPlayer({ account_balance: -20 });
		const match = await insertMatch({ host_id: host.host_id, ...hoursFromNow(48) });
		const res = makeResponse();

		await addPlayerToMatch(rosterRequest(match.match_id, broke.player_id), res);

		expect(res.statusCode).toBe(400);
		expect(await eventsFor(match.match_id)).toEqual([]);
	});

	it("records a deleted match as match_deleted, not as everyone leaving", async () => {
		const host = await insertHost();
		const player = await insertPlayer();
		const match = await insertMatch({ host_id: host.host_id, ...hoursFromNow(48) });
		await addPlayerToMatch(rosterRequest(match.match_id, player.player_id), makeResponse());

		const res = makeResponse();
		await deleteMatch({ params: { match_id: match.match_id } }, res);

		// The history table has no foreign key to matches on purpose: one would
		// make the cascade from matches -> match_players -> this trigger fail, and
		// deleting a match would stop working.
		expect(res.body).toEqual({ message: "Match successfully deleted." });
		const events = await eventsFor(match.match_id);
		expect(events.map((e) => e.event)).toEqual(["joined", "match_deleted"]);
	});
});
