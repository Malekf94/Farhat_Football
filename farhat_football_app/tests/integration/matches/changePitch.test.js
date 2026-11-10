import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
	pool,
	resetDatabase,
	insertHost,
	insertMatch,
	insertPitch,
	makeResponse,
} from "../helpers/seed.js";

const mod = await import("../../../Apis/matches/controller.cjs");
const { updateMatch } = mod.default ?? mod;

// Moving a match to another venue without deleting and recreating it, which
// would lose the roster. pitch_id has no foreign key, so the controller is the
// only thing stopping a match pointing at a pitch that does not exist.

const matchRow = async (match_id) => {
	const { rows } = await pool.query(
		"SELECT pitch_id, match_name, match_status FROM matches WHERE match_id = $1",
		[match_id],
	);
	return rows[0];
};

const pitchName = async (pitch_id) => {
	const { rows } = await pool.query(
		"SELECT pitch_name FROM pitches WHERE pitch_id = $1",
		[pitch_id],
	);
	return rows[0].pitch_name;
};

const edit = (match_id, overrides = {}) => ({
	params: { match_id },
	body: {
		match_status: "upcoming",
		match_time: "19:00:00",
		number_of_players: 10,
		price: 6,
		youtube_links: null,
		winning_team: null,
		...overrides,
	},
});

describe("updateMatch pitch change", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	afterAll(async () => {
		await pool.end();
	});

	it("moves an unfinished match to another pitch", async () => {
		const host = await insertHost();
		const match = await insertMatch({ host_id: host.host_id });
		const newPitch = await insertPitch();
		const res = makeResponse();

		await updateMatch(edit(match.match_id, { pitch_id: newPitch.pitch_id }), res);

		expect(res.statusCode).toBe(200);
		expect((await matchRow(match.match_id)).pitch_id).toBe(newPitch.pitch_id);
	});

	it("renames the match after the new pitch", async () => {
		const host = await insertHost();
		const match = await insertMatch({ host_id: host.host_id });
		const newPitch = await insertPitch();

		await updateMatch(
			edit(match.match_id, { pitch_id: newPitch.pitch_id }),
			makeResponse(),
		);

		const { match_name } = await matchRow(match.match_id);
		expect(match_name.startsWith(`${await pitchName(newPitch.pitch_id)}-`)).toBe(true);
	});

	it("keeps the pitch when the edit does not send one", async () => {
		const host = await insertHost();
		const match = await insertMatch({ host_id: host.host_id });
		const before = (await matchRow(match.match_id)).pitch_id;
		const res = makeResponse();

		await updateMatch(edit(match.match_id), res);

		expect(res.statusCode).toBe(200);
		expect((await matchRow(match.match_id)).pitch_id).toBe(before);
	});

	it("rejects a pitch that does not exist and changes nothing", async () => {
		const host = await insertHost();
		const match = await insertMatch({ host_id: host.host_id });
		const before = (await matchRow(match.match_id)).pitch_id;
		const res = makeResponse();

		await updateMatch(edit(match.match_id, { pitch_id: 999999, number_of_players: 12 }), res);

		expect(res.statusCode).toBe(404);
		const after = await matchRow(match.match_id);
		expect(after.pitch_id).toBe(before);
		expect(after.match_name).toMatch(/-10s-/);
	});

	it("refuses to move a match that has been finalised", async () => {
		const host = await insertHost();
		const match = await insertMatch({ host_id: host.host_id, match_status: "completed" });
		const before = (await matchRow(match.match_id)).pitch_id;
		const newPitch = await insertPitch();
		const res = makeResponse();

		await updateMatch(
			edit(match.match_id, { match_status: "completed", pitch_id: newPitch.pitch_id }),
			res,
		);

		expect(res.statusCode).toBe(409);
		expect((await matchRow(match.match_id)).pitch_id).toBe(before);
	});

	// The edit form always sends the current pitch, so saving a finalised match
	// (say, to add a YouTube link) must not trip the guard above.
	it("still saves a finalised match that keeps its pitch", async () => {
		const host = await insertHost();
		const match = await insertMatch({ host_id: host.host_id, match_status: "completed" });
		const { pitch_id } = await matchRow(match.match_id);
		const res = makeResponse();

		await updateMatch(
			edit(match.match_id, {
				match_status: "completed",
				pitch_id,
				youtube_links: "https://youtu.be/x",
			}),
			res,
		);

		expect(res.statusCode).toBe(200);
	});
});
