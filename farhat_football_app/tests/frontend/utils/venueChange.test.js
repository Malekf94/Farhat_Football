import { describe, it, expect } from "vitest";
import { venueChangeMessage } from "../../../src/utils/venueChange.js";

// The draft the "Email Players" modal opens with after a match moves pitch.
// match_date arrives from the API as an ISO timestamp, match_time as HH:MM:SS.

const match = { match_date: "2026-11-12T00:00:00.000Z", match_time: "19:00:00" };
const pitch = {
	pitch_name: "Goals Wembley",
	address: "1 Stadium Way",
	postcode: "HA9 0WS",
};
const url = "www.farhatfootball.co.uk/matches/245";

describe("venueChangeMessage", () => {
	it("names the game's date and time and the full new venue", () => {
		expect(venueChangeMessage({ match, pitch, matchUrl: url })).toBe(
			"Venue change: the game on Thursday 12 November at 19:00 has moved to " +
				"Goals Wembley, 1 Stadium Way, HA9 0WS. Details: www.farhatfootball.co.uk/matches/245",
		);
	});

	it("uses the calendar date, not one shifted by the timestamp's time zone", () => {
		const late = { ...match, match_date: "2026-06-12T23:30:00.000Z" };

		expect(venueChangeMessage({ match: late, pitch, matchUrl: url })).toContain(
			"Friday 12 June",
		);
	});

	it("leaves out address parts the pitch does not have", () => {
		const bare = { pitch_name: "Goals Wembley", address: "", postcode: null };

		expect(venueChangeMessage({ match, pitch: bare, matchUrl: url })).toContain(
			"has moved to Goals Wembley. Details:",
		);
	});
});
