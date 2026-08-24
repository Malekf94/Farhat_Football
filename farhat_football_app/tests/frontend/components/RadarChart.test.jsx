import { describe, it, expect } from "vitest";
import { computeRadarStats } from "../../../src/components/RadarChart.jsx";

const labels = (stats) => stats.map((s) => s.label);
const valueOf = (stats, label) => stats.find((s) => s.label === label).value;

describe("computeRadarStats", () => {
	it("returns null when there are no attributes", () => {
		expect(computeRadarStats(null)).toBeNull();
		expect(computeRadarStats(undefined)).toBeNull();
	});

	it("returns the six categories in a fixed order", () => {
		expect(labels(computeRadarStats({}))).toEqual([
			"PAC",
			"SHO",
			"PAS",
			"DRI",
			"DEF",
			"PHY",
		]);
	});

	it("averages the keys in a category and rounds to an integer", () => {
		const stats = computeRadarStats({
			short_passing: 10,
			long_passing: 11,
			vision: 12,
		});
		expect(valueOf(stats, "PAS")).toBe(11);
	});

	it("rounds halves upward", () => {
		expect(valueOf(computeRadarStats({ finishing: 10, long_shots: 11 }), "SHO")).toBe(11);
	});

	// pg returns DECIMAL/NUMERIC columns as strings, so attributes arriving
	// from the API are frequently "12" rather than 12.
	it("coerces numeric strings", () => {
		const stats = computeRadarStats({
			tackling: "12",
			marking: "12",
			positioning: "12",
		});
		expect(valueOf(stats, "DEF")).toBe(12);
	});

	// A missing key counts as 0 rather than being dropped, so a partially
	// populated category is dragged down, not averaged over the keys present.
	it("treats a missing key as zero, not as absent", () => {
		const stats = computeRadarStats({ tackling: 12, marking: 12 });
		expect(valueOf(stats, "DEF")).toBe(8);
	});

	it("treats a single-key category as that value", () => {
		expect(valueOf(computeRadarStats({ pace: 17 }), "PAC")).toBe(17);
	});
});
