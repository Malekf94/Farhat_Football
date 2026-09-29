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
const { getRosterEvents } = mod.default ?? mod;

// The superadmin Roster History page: match_player_events (migration 0003),
// newest first, 20 a page, optionally filtered by match and by player.

const PAGE_SIZE = 20;

const addEvent = async ({
	match_id,
	player_id,
	event = "joined",
	occurred_at = "2026-09-01T18:00:00Z",
}) => {
	const { rows } = await pool.query(
		`INSERT INTO match_player_events (match_id, player_id, event, occurred_at)
		 VALUES ($1, $2, $3, $4)
		 RETURNING event_id`,
		[match_id, player_id, event, occurred_at],
	);
	return rows[0].event_id;
};

const minutesAfter = (minutes) =>
	new Date(Date.UTC(2026, 8, 1, 18, minutes)).toISOString();

const list = async (query = {}) => {
	const res = makeResponse();
	await getRosterEvents({ query }, res);
	return res;
};

describe("getRosterEvents", () => {
	let host;

	beforeEach(async () => {
		await resetDatabase();
		host = await insertHost();
	});

	afterAll(async () => {
		await pool.end();
	});

	it("returns 20 events a page, newest first, with the total", async () => {
		const player = await insertPlayer();
		const match = await insertMatch({ host_id: host.host_id });
		for (let i = 0; i < 25; i++) {
			await addEvent({
				match_id: match.match_id,
				player_id: player.player_id,
				occurred_at: minutesAfter(i),
			});
		}

		const { body } = await list();

		expect(body.total).toBe(25);
		expect(body.page).toBe(1);
		expect(body.limit).toBe(PAGE_SIZE);
		expect(body.data).toHaveLength(PAGE_SIZE);
		expect(new Date(body.data[0].occurred_at).toISOString()).toBe(minutesAfter(24));
		expect(new Date(body.data[19].occurred_at).toISOString()).toBe(minutesAfter(5));
	});

	it("never repeats or skips a row across pages, even when timestamps tie", async () => {
		const player = await insertPlayer();
		const match = await insertMatch({ host_id: host.host_id });
		const ids = [];
		for (let i = 0; i < 25; i++) {
			ids.push(
				await addEvent({ match_id: match.match_id, player_id: player.player_id }),
			);
		}

		const first = await list({ page: "1" });
		const second = await list({ page: "2" });

		expect(second.body.data).toHaveLength(5);
		const seen = [...first.body.data, ...second.body.data].map((r) => r.event_id);
		expect(new Set(seen).size).toBe(25);
		expect([...seen].sort((a, b) => a - b)).toEqual([...ids].sort((a, b) => a - b));
	});

	it("filters by match, and the total follows the filter", async () => {
		const player = await insertPlayer();
		const a = await insertMatch({ host_id: host.host_id });
		const b = await insertMatch({ host_id: host.host_id });
		await addEvent({ match_id: a.match_id, player_id: player.player_id });
		await addEvent({ match_id: b.match_id, player_id: player.player_id });
		await addEvent({ match_id: b.match_id, player_id: player.player_id, event: "left" });

		const { body } = await list({ match_id: String(b.match_id) });

		expect(body.total).toBe(2);
		expect(body.data.every((r) => r.match_id === b.match_id)).toBe(true);
	});

	it("filters by part of a player's name, ignoring case, or by exact player id", async () => {
		const zak = await insertPlayer({ preferred_name: "Zakaria" });
		const other = await insertPlayer({ preferred_name: "Someone" });
		const match = await insertMatch({ host_id: host.host_id });
		await addEvent({ match_id: match.match_id, player_id: zak.player_id });
		await addEvent({ match_id: match.match_id, player_id: other.player_id });

		const byName = await list({ player: "zAK" });
		const byId = await list({ player: String(other.player_id) });

		expect(byName.body.data.map((r) => r.player_id)).toEqual([zak.player_id]);
		expect(byName.body.data[0].preferred_name).toBe("Zakaria");
		expect(byId.body.data.map((r) => r.player_id)).toEqual([other.player_id]);
	});

	it("still lists events whose match has since been deleted", async () => {
		const player = await insertPlayer();
		await addEvent({ match_id: 999999, player_id: player.player_id, event: "match_deleted" });

		const { body } = await list();

		expect(body.total).toBe(1);
		expect(body.data[0]).toMatchObject({
			match_id: 999999,
			event: "match_deleted",
			match_date: null,
		});
	});

	it("rejects a match id that is not a whole number", async () => {
		const res = await list({ match_id: "12abc" });

		expect(res.statusCode).toBe(400);
	});

	it("treats a missing or nonsense page as page 1", async () => {
		const player = await insertPlayer();
		const match = await insertMatch({ host_id: host.host_id });
		await addEvent({ match_id: match.match_id, player_id: player.player_id });

		for (const page of [undefined, "0", "-3", "abc"]) {
			const { body } = await list({ page });
			expect(body.page).toBe(1);
			expect(body.data).toHaveLength(1);
		}
	});
});
