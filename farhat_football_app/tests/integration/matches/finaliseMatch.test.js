import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
	pool,
	resetDatabase,
	insertPlayer,
	insertHost,
	insertMatch,
	makeResponse,
} from "../helpers/seed.js";

const mod = await import("../../../Apis/matches/controller.cjs");
const { updateMatch } = mod.default ?? mod;

// REL-001: reserve removal, the charges and the status change commit together.
// Charges used to commit in their own transaction before the status was
// written, so anything failing in between left players charged for a match
// that never finalised.

const addToRoster = async (match_id, player_id, { team_id = 1, price = 6, late = false } = {}) => {
	await pool.query(
		`INSERT INTO match_players (match_id, player_id, goals, assists, defcons,
			chancescreated, own_goals, late, price, team_id)
		 VALUES ($1, $2, 0, 0, 0, 0, 0, $3, $4, $5)`,
		[match_id, player_id, late, price, team_id],
	);
};

const balanceOf = async (player_id) => {
	const { rows } = await pool.query(
		"SELECT account_balance FROM players WHERE player_id = $1",
		[player_id],
	);
	return rows[0].account_balance;
};

const statusOf = async (match_id) => {
	const { rows } = await pool.query(
		"SELECT match_status FROM matches WHERE match_id = $1",
		[match_id],
	);
	return rows[0].match_status;
};

const chargeCount = async (match_id) => {
	const { rows } = await pool.query(
		"SELECT COUNT(*)::int AS n FROM payments WHERE transaction_id LIKE $1",
		[`match_charge_${match_id}_%`],
	);
	return rows[0].n;
};

const finalise = (match_id, overrides = {}) => ({
	params: { match_id },
	body: {
		match_status: "completed",
		match_time: "19:00:00",
		number_of_players: 10,
		price: 6,
		youtube_links: null,
		winning_team: 1,
		...overrides,
	},
});

describe("updateMatch finalisation", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	afterAll(async () => {
		await pool.end();
	});

	it("charges the roster and records the new status together", async () => {
		const host = await insertHost();
		const match = await insertMatch({ host_id: host.host_id, price: 6 });
		const player = await insertPlayer();
		await addToRoster(match.match_id, player.player_id);
		const res = makeResponse();

		await updateMatch(finalise(match.match_id), res);

		expect(await statusOf(match.match_id)).toBe("completed");
		expect(await balanceOf(player.player_id)).toBe("-6.00");
		expect(await chargeCount(match.match_id)).toBe(1);
	});

	it("adds a pound for a player marked late", async () => {
		const host = await insertHost();
		const match = await insertMatch({ host_id: host.host_id });
		const player = await insertPlayer();
		await addToRoster(match.match_id, player.player_id, { late: true });

		await updateMatch(finalise(match.match_id), makeResponse());

		expect(await balanceOf(player.player_id)).toBe("-7.00");
	});

	it("drops reserves from the roster before charging", async () => {
		const host = await insertHost();
		const match = await insertMatch({ host_id: host.host_id });
		const playing = await insertPlayer();
		const reserve = await insertPlayer();
		await addToRoster(match.match_id, playing.player_id, { team_id: 1 });
		await addToRoster(match.match_id, reserve.player_id, { team_id: 0 });

		await updateMatch(finalise(match.match_id), makeResponse());

		expect(await balanceOf(playing.player_id)).toBe("-6.00");
		expect(await balanceOf(reserve.player_id)).toBe("0.00");
		expect(await chargeCount(match.match_id)).toBe(1);
	});

	it("rolls the charges back when the status update fails", async () => {
		const host = await insertHost();
		const match = await insertMatch({ host_id: host.host_id });
		const player = await insertPlayer();
		await addToRoster(match.match_id, player.player_id);
		const res = makeResponse();

		// winning_team has a CHECK constraint allowing only 1 or 2, so this makes
		// the status update itself fail after the charges have been written —
		// the exact ordering the ticket is about.
		await updateMatch(finalise(match.match_id, { winning_team: 99 }), res);

		expect(res.statusCode).toBe(500);
		expect(await chargeCount(match.match_id)).toBe(0);
		expect(await balanceOf(player.player_id)).toBe("0.00");
		expect(await statusOf(match.match_id)).toBe("upcoming");
	});

	it("charges once when the same match is finalised twice", async () => {
		const host = await insertHost();
		const match = await insertMatch({ host_id: host.host_id });
		const player = await insertPlayer();
		await addToRoster(match.match_id, player.player_id);

		await updateMatch(finalise(match.match_id), makeResponse());
		await updateMatch(finalise(match.match_id), makeResponse());

		expect(await chargeCount(match.match_id)).toBe(1);
		expect(await balanceOf(player.player_id)).toBe("-6.00");
	});

	it("charges once when two finalisations race", async () => {
		const host = await insertHost();
		const match = await insertMatch({ host_id: host.host_id });
		const player = await insertPlayer();
		await addToRoster(match.match_id, player.player_id);

		await Promise.all([
			updateMatch(finalise(match.match_id), makeResponse()),
			updateMatch(finalise(match.match_id), makeResponse()),
		]);

		expect(await chargeCount(match.match_id)).toBe(1);
		expect(await balanceOf(player.player_id)).toBe("-6.00");
	});

	it("does not charge for an edit that leaves the match unfinished", async () => {
		const host = await insertHost();
		const match = await insertMatch({ host_id: host.host_id });
		const player = await insertPlayer();
		await addToRoster(match.match_id, player.player_id);

		await updateMatch(
			finalise(match.match_id, { match_status: "upcoming", winning_team: null }),
			makeResponse(),
		);

		expect(await chargeCount(match.match_id)).toBe(0);
		expect(await balanceOf(player.player_id)).toBe("0.00");
	});

	it("reports an unknown match as not found", async () => {
		const res = makeResponse();

		await updateMatch(finalise(999999), res);

		expect(res.statusCode).toBe(404);
	});

	it("leaves no connection stranded in a transaction", async () => {
		const host = await insertHost();
		const match = await insertMatch({ host_id: host.host_id });
		const player = await insertPlayer();
		await addToRoster(match.match_id, player.player_id);

		await updateMatch(finalise(match.match_id), makeResponse());

		const { rows } = await pool.query(
			`SELECT count(*)::int AS n FROM pg_stat_activity
			 WHERE datname = current_database()
			   AND state IN ('idle in transaction', 'idle in transaction (aborted)')`,
		);
		expect(rows[0].n).toBe(0);
	});
});
