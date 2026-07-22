/**
 * randomiserMk3 — balanced team splitter.
 *
 * Balances two teams across FIVE categories:
 *   1. Workrate
 *   2. Concentration + Decision making
 *   3. Teamwork
 *   4. Tackling + Positioning + Marking  (defensive)
 *   5. Mental
 *
 * Strategy: simulated annealing over random swaps.
 * - Start from a greedy snake-draft split (good starting point).
 * - Score a split by the total absolute difference between the teams across
 *   the five categories (lower = more balanced).
 * - Repeatedly try random single-player swaps; keep improvements, and
 *   occasionally keep a worse swap early on to escape local optima.
 * - Restart a few times and keep the best; stop early once the difference is
 *   within TARGET_DIFFERENCE.
 *
 * Enough randomness that teams aren't identical every week, but always aims
 * for a tightly balanced result.
 */

// How close the two teams' combined-category totals must be. The algorithm
// keeps trying to get the total difference at or below this; if it can't, it
// returns the best split it found and logs a warning.
const TARGET_DIFFERENCE = 20;
const RESTARTS = 10;
const ITERATIONS = 800;

const n = (player, key) => Number(player[key] || 0);

// The five category values for a single player.
function categories(player) {
	return {
		workrate: n(player, "workrate"),
		concentration: n(player, "concentration") + n(player, "decision_making"),
		teamwork: n(player, "teamwork"),
		defensive:
			n(player, "tackling") + n(player, "positioning") + n(player, "marking"),
		mental: n(player, "mental"),
	};
}

// A player's overall rating (sum of the five categories) — used for the snake
// draft ordering and to detect unrated players.
function playerOverall(player) {
	const c = categories(player);
	return c.workrate + c.concentration + c.teamwork + c.defensive + c.mental;
}

function teamTotals(team) {
	const t = { workrate: 0, concentration: 0, teamwork: 0, defensive: 0, mental: 0 };
	for (const p of team) {
		const c = categories(p);
		t.workrate += c.workrate;
		t.concentration += c.concentration;
		t.teamwork += c.teamwork;
		t.defensive += c.defensive;
		t.mental += c.mental;
	}
	return t;
}

// Total absolute difference between the two teams across the five categories.
function difference(t1, t2) {
	const a = teamTotals(t1);
	const b = teamTotals(t2);
	return (
		Math.abs(a.workrate - b.workrate) +
		Math.abs(a.concentration - b.concentration) +
		Math.abs(a.teamwork - b.teamwork) +
		Math.abs(a.defensive - b.defensive) +
		Math.abs(a.mental - b.mental)
	);
}

function shuffle(array) {
	const a = [...array];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

function snakeDraft(players) {
	// Sort best → worst by overall, then snake-draft into two teams.
	const sorted = [...players].sort((a, b) => playerOverall(b) - playerOverall(a));
	const t1 = [];
	const t2 = [];
	sorted.forEach((p, i) => {
		const round = Math.floor(i / 2);
		const pick = i % 2;
		(round % 2 === 0 ? (pick === 0 ? t1 : t2) : pick === 0 ? t2 : t1).push(p);
	});
	return [t1, t2];
}

// One simulated-annealing run from a given starting split.
function anneal(seed) {
	let [team1, team2] = seed;
	let bestDiff = difference(team1, team2);
	let bestTeams = [team1.map((p) => ({ ...p })), team2.map((p) => ({ ...p }))];

	for (let iter = 0; iter < ITERATIONS; iter++) {
		const temperature = 50 * (1 - iter / ITERATIONS); // linear cooling

		const i1 = Math.floor(Math.random() * team1.length);
		const i2 = Math.floor(Math.random() * team2.length);

		[team1[i1], team2[i2]] = [team2[i2], team1[i1]]; // swap

		const newDiff = difference(team1, team2);
		const delta = newDiff - bestDiff;

		if (delta < 0) {
			bestDiff = newDiff;
			bestTeams = [team1.map((p) => ({ ...p })), team2.map((p) => ({ ...p }))];
		} else if (temperature > 0 && Math.random() < Math.exp(-delta / temperature)) {
			// keep exploring from this worse position
		} else {
			[team1[i1], team2[i2]] = [team2[i2], team1[i1]]; // revert
		}
	}

	return { teams: bestTeams, diff: bestDiff };
}

export const randomiserMk3 = (playersAttributes) => {
	const players = [...playersAttributes];

	// Players with a zero overall haven't been rated yet. Substitute the
	// per-attribute average from rated players so they're treated as neutral
	// unknowns and spread evenly rather than dumped on one team.
	const rated = players.filter((p) => playerOverall(p) > 0);
	let effective = players;

	if (rated.length > 0 && rated.length < players.length) {
		const sampleKeys = Object.keys(rated[0]).filter(
			(k) =>
				typeof rated[0][k] === "number" && !k.endsWith("_id") && k !== "team_id",
		);
		const avgAttrs = {};
		for (const key of sampleKeys) {
			avgAttrs[key] = Math.round(
				rated.reduce((sum, p) => sum + Number(p[key] || 0), 0) / rated.length,
			);
		}
		effective = players.map((p) =>
			playerOverall(p) === 0 ? { ...p, ...avgAttrs } : p,
		);
	}

	// Try several annealing runs and keep the best; stop early once we're
	// within the target difference. The first run seeds from a snake draft;
	// later runs seed from shuffled splits for variety.
	let best = null;
	for (let r = 0; r < RESTARTS; r++) {
		const seed =
			r === 0
				? snakeDraft(effective)
				: (() => {
						const s = shuffle(effective);
						const half = Math.ceil(s.length / 2);
						return [s.slice(0, half), s.slice(half)];
				  })();

		const result = anneal(seed);
		if (!best || result.diff < best.diff) best = result;
		if (best.diff <= TARGET_DIFFERENCE) break;
	}

	if (best.diff > TARGET_DIFFERENCE) {
		console.warn(
			`Team balance difference ${best.diff} exceeds target ${TARGET_DIFFERENCE}. Returning the closest split found.`,
		);
	}

	return { team1: best.teams[0], team2: best.teams[1] };
};
