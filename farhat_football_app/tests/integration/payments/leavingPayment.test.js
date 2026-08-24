import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
	pool,
	resetDatabase,
	insertPlayer,
	insertHost,
	insertMatch,
	makeResponse,
} from "../helpers/seed.js";

const mod = await import("../../../Apis/payments/controller.cjs");
const { leavingPayment } = mod.default ?? mod;

// SEC-002: leaving is one server-owned command. The caller used to name the
// player and the price, and the transaction id carried a timestamp, so the same
// request could be replayed to charge somebody repeatedly.

// Kick-off is stored as a date plus a time, so these are built relative to now
// and kept well clear of the five-hour boundary — an hour of drift either way
// must not flip which side of it a case lands on.
const hoursFromNow = (hours) => {
	const at = new Date(Date.now() + hours * 60 * 60 * 1000);
	return {
		match_date: at.toISOString().slice(0, 10),
		match_time: at.toISOString().slice(11, 19),
	};
};

const addToRoster = async (match_id, player_id) => {
	await pool.query(
		`INSERT INTO match_players (match_id, player_id, goals, assists, defcons,
			chancescreated, own_goals, late, price, team_id)
		 VALUES ($1, $2, 0, 0, 0, 0, 0, FALSE, 6, 1)`,
		[match_id, player_id],
	);
};

const balanceOf = async (player_id) => {
	const { rows } = await pool.query(
		"SELECT account_balance FROM players WHERE player_id = $1",
		[player_id],
	);
	return rows[0].account_balance;
};

const onRoster = async (match_id, player_id) => {
	const { rows } = await pool.query(
		"SELECT 1 FROM match_players WHERE match_id = $1 AND player_id = $2",
		[match_id, player_id],
	);
	return rows.length > 0;
};

const paymentRows = async (player_id) => {
	const { rows } = await pool.query(
		"SELECT amount, transaction_id FROM payments WHERE user_id = $1",
		[player_id],
	);
	return rows;
};

const leaveRequest = (match_id, targetPlayerId, body = {}) => ({
	body: { match_id, ...body },
	targetPlayerId,
});

const seedLeaver = async ({ hours = 1, price = 6, status = "upcoming" } = {}) => {
	const host = await insertHost();
	const match = await insertMatch({
		host_id: host.host_id,
		price,
		match_status: status,
		...hoursFromNow(hours),
	});
	const player = await insertPlayer();
	await addToRoster(match.match_id, player.player_id);
	return { match, player };
};

describe("leavingPayment", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	afterAll(async () => {
		await pool.end();
	});

	it("charges the match fee when leaving inside the cutoff", async () => {
		const { match, player } = await seedLeaver({ hours: 1, price: 6 });
		const res = makeResponse();

		await leavingPayment(leaveRequest(match.match_id, player.player_id), res);

		expect(res.body.charged).toBe(true);
		expect(await balanceOf(player.player_id)).toBe("-6.00");
		expect(await onRoster(match.match_id, player.player_id)).toBe(false);
	});

	it("charges nothing when leaving well before kick-off", async () => {
		const { match, player } = await seedLeaver({ hours: 48 });
		const res = makeResponse();

		await leavingPayment(leaveRequest(match.match_id, player.player_id), res);

		expect(res.body.charged).toBe(false);
		expect(await balanceOf(player.player_id)).toBe("0.00");
		expect(await onRoster(match.match_id, player.player_id)).toBe(false);
	});

	it("ignores a price supplied by the caller", async () => {
		const { match, player } = await seedLeaver({ hours: 1, price: 6 });
		const res = makeResponse();

		await leavingPayment(
			leaveRequest(match.match_id, player.player_id, {
				price: 999,
				matchData: { price: 999 },
			}),
			res,
		);

		expect(await balanceOf(player.player_id)).toBe("-6.00");
	});

	it("charges once however many times the request is replayed", async () => {
		const { match, player } = await seedLeaver({ hours: 1 });

		await leavingPayment(leaveRequest(match.match_id, player.player_id), makeResponse());
		await addToRoster(match.match_id, player.player_id);
		await leavingPayment(leaveRequest(match.match_id, player.player_id), makeResponse());
		await addToRoster(match.match_id, player.player_id);
		await leavingPayment(leaveRequest(match.match_id, player.player_id), makeResponse());

		expect(await paymentRows(player.player_id)).toHaveLength(1);
		expect(await balanceOf(player.player_id)).toBe("-6.00");
	});

	it("uses a transaction id derived only from the match and the player", async () => {
		const { match, player } = await seedLeaver({ hours: 1 });

		await leavingPayment(leaveRequest(match.match_id, player.player_id), makeResponse());

		const [payment] = await paymentRows(player.player_id);
		expect(payment.transaction_id).toBe(
			`match_exit_${match.match_id}_${player.player_id}`,
		);
	});

	it("refuses a player who is not on the roster, and charges nothing", async () => {
		const { match } = await seedLeaver({ hours: 1 });
		const outsider = await insertPlayer();
		const res = makeResponse();

		await leavingPayment(leaveRequest(match.match_id, outsider.player_id), res);

		expect(res.statusCode).toBe(404);
		expect(await paymentRows(outsider.player_id)).toHaveLength(0);
		expect(await balanceOf(outsider.player_id)).toBe("0.00");
	});

	it("refuses to process a leave for a match already finalised", async () => {
		const { match, player } = await seedLeaver({ hours: 1, status: "completed" });
		const res = makeResponse();

		await leavingPayment(leaveRequest(match.match_id, player.player_id), res);

		expect(res.statusCode).toBe(400);
		expect(await onRoster(match.match_id, player.player_id)).toBe(true);
		expect(await paymentRows(player.player_id)).toHaveLength(0);
	});

	it("reports an unknown match without touching the roster", async () => {
		const { match, player } = await seedLeaver({ hours: 1 });
		const res = makeResponse();

		await leavingPayment(leaveRequest(999999, player.player_id), res);

		expect(res.statusCode).toBe(404);
		expect(await onRoster(match.match_id, player.player_id)).toBe(true);
	});

	it("rejects a request with no match id", async () => {
		const { player } = await seedLeaver({ hours: 1 });
		const res = makeResponse();

		await leavingPayment({ body: {}, targetPlayerId: player.player_id }, res);

		expect(res.statusCode).toBe(400);
	});

	it("leaves no connection stranded in a transaction", async () => {
		const { match, player } = await seedLeaver({ hours: 1 });

		await leavingPayment(leaveRequest(match.match_id, player.player_id), makeResponse());

		const { rows } = await pool.query(
			`SELECT count(*)::int AS n FROM pg_stat_activity
			 WHERE datname = current_database()
			   AND state IN ('idle in transaction', 'idle in transaction (aborted)')`,
		);
		expect(rows[0].n).toBe(0);
	});
});
