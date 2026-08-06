/**
 * randomiserMk3 — balanced team splitter.
 *
 * Balances two teams across SIX dimensions, each with its own allowed
 * difference between the teams:
 *   1. Workrate                              (≤ 20)
 *   2. Concentration + Decision making       (≤ 20)
 *   3. Teamwork                              (≤ 20)
 *   4. Tackling + Positioning + Marking      (≤ 20)
 *   5. Mental                                (≤ 20)
 *   6. Total stats (sum of all attributes)   (≤ 45)
 *
 * Because the dimensions are on very different scales, the algorithm scores a
 * split by how far each dimension is RELATIVE TO ITS OWN THRESHOLD, and always
 * works on the worst-off dimension first. Simulated annealing over random
 * swaps, restarted a few times; stops early once every dimension is within its
 * threshold. Logs the full breakdown to the console.
 */

// Allowed difference between the two teams for each dimension.
const THRESHOLDS = {
	workrate: 20,
	concentration: 20,
	teamwork: 20,
	defensive: 20,
	mental: 20,
	total: 45,
};

const CATEGORY_LABELS = {
	workrate: "Workrate",
	concentration: "Concentration + Decision making",
	teamwork: "Teamwork",
	defensive: "Tackling + Positioning + Marking",
	mental: "Mental",
	total: "Total stats",
};

const RESTARTS = 10;
const ITERATIONS = 800;

const n = (player, key) => Number(player[key] || 0);

// Sum of every numeric attribute on a player (their overall rating).
function totalStats(player) {
	let sum = 0;
	for (const [key, val] of Object.entries(player)) {
		if (typeof val === "number" && !key.endsWith("_id") && key !== "team_id") {
			sum += val;
		}
	}
	return sum;
}

// The six dimension values for a single player.
function dimensions(player) {
	return {
		workrate: n(player, "workrate"),
		concentration: n(player, "concentration") + n(player, "decision_making"),
		teamwork: n(player, "teamwork"),
		defensive:
			n(player, "tackling") + n(player, "positioning") + n(player, "marking"),
		mental: n(player, "mental"),
		total: totalStats(player),
	};
}

function teamTotals(team) {
	const t = {
		workrate: 0,
		concentration: 0,
		teamwork: 0,
		defensive: 0,
		mental: 0,
		total: 0,
	};
	for (const p of team) {
		const d = dimensions(p);
		for (const key of Object.keys(t)) t[key] += d[key];
	}
	return t;
}

// Absolute difference between the two teams in each dimension.
function diffs(t1, t2) {
	const a = teamTotals(t1);
	const b = teamTotals(t2);
	const out = {};
	for (const key of Object.keys(THRESHOLDS)) {
		out[key] = Math.abs(a[key] - b[key]);
	}
	return out;
}

// Each difference relative to its own threshold (1.0 = exactly on the limit).
const normalised = (d) =>
	Object.keys(THRESHOLDS).map((key) => d[key] / THRESHOLDS[key]);

// Score to minimise: worst-off dimension dominates, total (scaled) as a
// tie-breaker so the others keep improving too.
function score(t1, t2) {
	const norm = normalised(diffs(t1, t2));
	const worst = Math.max(...norm);
	const sum = norm.reduce((s, v) => s + v, 0);
	return worst + sum / 100;
}

const withinAllThresholds = (d) =>
	Object.keys(THRESHOLDS).every((key) => d[key] <= THRESHOLDS[key]);

function shuffle(array) {
	const a = [...array];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

function snakeDraft(players) {
	// Sort best → worst by overall (total stats), then snake-draft.
	const sorted = [...players].sort((a, b) => totalStats(b) - totalStats(a));
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
	let bestScore = score(team1, team2);
	let bestTeams = [team1.map((p) => ({ ...p })), team2.map((p) => ({ ...p }))];

	for (let iter = 0; iter < ITERATIONS; iter++) {
		const temperature = 50 * (1 - iter / ITERATIONS); // linear cooling

		const i1 = Math.floor(Math.random() * team1.length);
		const i2 = Math.floor(Math.random() * team2.length);

		[team1[i1], team2[i2]] = [team2[i2], team1[i1]]; // swap

		const newScore = score(team1, team2);
		const delta = newScore - bestScore;

		if (delta < 0) {
			bestScore = newScore;
			bestTeams = [team1.map((p) => ({ ...p })), team2.map((p) => ({ ...p }))];
		} else if (temperature > 0 && Math.random() < Math.exp(-delta / temperature)) {
			// keep exploring from this worse position
		} else {
			[team1[i1], team2[i2]] = [team2[i2], team1[i1]]; // revert
		}
	}

	return { teams: bestTeams };
}

// Print the final teams and each dimension's difference vs its threshold.
function logResult(team1, team2) {
	const d = diffs(team1, team2);
	const a = teamTotals(team1);
	const b = teamTotals(team2);

	console.log("=== Team balance ===");
	console.log("Team 1:", team1.map((p) => p.preferred_name).join(", "));
	console.log("Team 2:", team2.map((p) => p.preferred_name).join(", "));
	console.log("Differences (team 1 vs team 2):");
	for (const key of Object.keys(THRESHOLDS)) {
		const ok = d[key] <= THRESHOLDS[key] ? "✅" : "⚠️";
		console.log(
			`  ${ok} ${CATEGORY_LABELS[key]}: ${a[key]} vs ${b[key]} = ${d[key]} (target ≤ ${THRESHOLDS[key]})`,
		);
	}
}

export const randomiserMk3 = (playersAttributes) => {
	const players = [...playersAttributes];

	// Players with a zero total haven't been rated yet. Substitute the
	// per-attribute average from rated players so they're treated as neutral
	// unknowns and spread evenly rather than dumped on one team.
	const rated = players.filter((p) => totalStats(p) > 0);
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
			totalStats(p) === 0 ? { ...p, ...avgAttrs } : p,
		);
	}

	// Try several annealing runs, keep the best; stop early once every
	// dimension is within its threshold. First run seeds from a snake draft;
	// later runs from shuffled splits for variety.
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
		if (!best || score(result.teams[0], result.teams[1]) < score(best.teams[0], best.teams[1])) {
			best = result;
		}
		if (withinAllThresholds(diffs(best.teams[0], best.teams[1]))) break;
	}

	const [team1, team2] = best.teams;
	logResult(team1, team2);

	if (!withinAllThresholds(diffs(team1, team2))) {
		console.warn(
			"Couldn't get every dimension within its target — this is the closest split found.",
		);
	}

	return { team1, team2 };
};
