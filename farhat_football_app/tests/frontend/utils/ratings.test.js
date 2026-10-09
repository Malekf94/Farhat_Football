import { describe, it, expect } from "vitest";
import {
	applySuggestedRatings,
	toSuggestionMap,
} from "../../../src/utils/ratings.js";

describe("toSuggestionMap", () => {
	it("keys the /suggested rows by ratee, keeping the average and vote count", () => {
		const map = toSuggestionMap([
			{ ratee_id: 5, suggested: "7.5", votes: "3" },
			{ ratee_id: 9, suggested: "6.0", votes: "1" },
		]);

		expect(map).toEqual({
			5: { suggested: "7.5", votes: "3" },
			9: { suggested: "6.0", votes: "1" },
		});
	});

	it("returns an empty map when nobody has voted", () => {
		expect(toSuggestionMap([])).toEqual({});
	});
});

// The "Use all suggested ratings" button: copy each player's voted average into
// their editable rating, exactly as the per-player "Use" button does.
// Suggested values come from ROUND(AVG(...)) — a NUMERIC — so pg delivers them
// as strings ("7.5"), and keys arrive as numbers or strings depending on source.

const edited = () => ({
	1: { goals: 2, rating: 6 },
	2: { goals: 0, rating: "" },
	3: { goals: 1, rating: null },
});

describe("applySuggestedRatings", () => {
	it("fills every player who has a suggestion, overwriting what was there", () => {
		const { stats, filled } = applySuggestedRatings(edited(), {
			1: { suggested: "7.5", votes: "4" },
			2: { suggested: "8.0", votes: "2" },
		});

		expect(stats[1].rating).toBe("7.5");
		expect(stats[2].rating).toBe("8.0");
		expect(filled).toBe(2);
	});

	it("leaves players without a suggestion untouched", () => {
		const { stats } = applySuggestedRatings(edited(), {
			1: { suggested: "7.5", votes: "4" },
		});

		expect(stats[2].rating).toBe("");
		expect(stats[3].rating).toBeNull();
	});

	it("keeps each player's other stats", () => {
		const { stats } = applySuggestedRatings(edited(), {
			1: { suggested: "7.5", votes: "4" },
		});

		expect(stats[1].goals).toBe(2);
	});

	it("ignores suggestions for players not in the edited set", () => {
		const { stats, filled } = applySuggestedRatings(edited(), {
			99: { suggested: "9.0", votes: "1" },
		});

		expect(stats).not.toHaveProperty("99");
		expect(filled).toBe(0);
	});

	it("does not mutate the object it was given", () => {
		const input = edited();
		applySuggestedRatings(input, { 1: { suggested: "7.5", votes: "4" } });

		expect(input[1].rating).toBe(6);
	});

	it("handles no suggestions at all", () => {
		const input = edited();
		const { stats, filled } = applySuggestedRatings(input, {});

		expect(stats).toEqual(input);
		expect(filled).toBe(0);
	});
});
