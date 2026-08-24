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
const { deleteMatch } = mod.default ?? mod;

// REL-002: deletion is one server-owned statement. The roster and the ratings
// go with the match through ON DELETE CASCADE, so there is no window in which
// the children are gone and the match is not.
const countIn = async (table, match_id) => {
	const { rows } = await pool.query(
		`SELECT COUNT(*)::int AS n FROM ${table} WHERE match_id = $1`,
		[match_id],
	);
	return rows[0].n;
};

const seedMatchWithRoster = async () => {
	const host = await insertHost();
	const match = await insertMatch({ host_id: host.host_id });
	const one = await insertPlayer();
	const two = await insertPlayer();
	for (const player of [one, two]) {
		await pool.query(
			`INSERT INTO match_players (match_id, player_id, goals, assists, defcons,
				chancescreated, own_goals, late, price, team_id)
			 VALUES ($1, $2, 0, 0, 0, 0, 0, FALSE, 6, 1)`,
			[match.match_id, player.player_id],
		);
	}
	await pool.query(
		`INSERT INTO match_player_ratings (match_id, rater_id, ratee_id, rating)
		 VALUES ($1, $2, $3, 8)`,
		[match.match_id, one.player_id, two.player_id],
	);
	return { match, one, two };
};

describe("deleteMatch", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	afterAll(async () => {
		await pool.end();
	});

	it("removes the match, its roster and its ratings together", async () => {
		const { match } = await seedMatchWithRoster();
		expect(await countIn("match_players", match.match_id)).toBe(2);
		expect(await countIn("match_player_ratings", match.match_id)).toBe(1);
		const res = makeResponse();

		await deleteMatch({ params: { match_id: match.match_id } }, res);

		expect(res.body).toEqual({ message: "Match successfully deleted." });
		expect(await countIn("match_players", match.match_id)).toBe(0);
		expect(await countIn("match_player_ratings", match.match_id)).toBe(0);
		const { rows } = await pool.query(
			"SELECT 1 FROM matches WHERE match_id = $1",
			[match.match_id],
		);
		expect(rows).toHaveLength(0);
	});

	it("leaves every other match untouched", async () => {
		const { match } = await seedMatchWithRoster();
		const survivor = await seedMatchWithRoster();
		const res = makeResponse();

		await deleteMatch({ params: { match_id: match.match_id } }, res);

		expect(await countIn("match_players", survivor.match.match_id)).toBe(2);
		expect(await countIn("match_player_ratings", survivor.match.match_id)).toBe(1);
	});

	it("reports an unknown match as not found", async () => {
		const res = makeResponse();

		await deleteMatch({ params: { match_id: 999999 } }, res);

		expect(res.statusCode).toBe(404);
	});

	it("does not leave the connection it used inside a transaction", async () => {
		const { match } = await seedMatchWithRoster();

		await deleteMatch({ params: { match_id: match.match_id }}, makeResponse());

		// A stray BEGIN issued through the pool would strand whichever connection
		// received it in an open transaction. Every pooled connection should be
		// idle once the delete has returned.
		const { rows } = await pool.query(
			`SELECT count(*)::int AS n FROM pg_stat_activity
			 WHERE datname = current_database()
			   AND state IN ('idle in transaction', 'idle in transaction (aborted)')`,
		);
		expect(rows[0].n).toBe(0);
	});
});
