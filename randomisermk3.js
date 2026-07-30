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
 * Goal: keep the difference between the two teams within TARGET_DIFFERENCE in
 * EACH category (not just overall). Strategy: simulated annealing over random
 * swaps, optimising primarily for the worst category (with the total as a
 * tie-breaker), restarting a few times and keeping the best split.
 *
 * Logs the final teams and the per-category differences to the console.
 */

// Max allowed difference between the two teams in EACH category.
const TARGET_DIFFERENCE = 20;
const RESTARTS = 10;
const ITERATIONS = 800;

const CATEGORY_LABELS = {
	workrate: "Workrate",
	concentration: "Concentration + Decision making",
	teamwork: "Teamwork",
	defensive: "Tackling + Positioning + Marking",
	mental: "Mental",
};

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

// Absolute difference between the two teams in each of the five categories.
function categoryDiffs(t1, t2) {
	const a = teamTotals(t1);
	const b = teamTotals(t2);
	return {
		workrate: Math.abs(a.workrate - b.workrate),
		concentration: Math.abs(a.concentration - b.concentration),
		teamwork: Math.abs(a.teamwork - b.teamwork),
		defensive: Math.abs(a.defensive - b.defensive),
		mental: Math.abs(a.mental - b.mental),
	};
}

const maxDiff = (diffs) => Math.max(...Object.values(diffs));
const sumDiff = (diffs) => Object.values(diffs).reduce((s, d) => s + d, 0);

// Score to minimise: the worst category difference dominates, with the total
// as a small tie-breaker so the other categories keep improving too.
function score(t1, t2) {
	const d = categoryDiffs(t1, t2);
	return maxDiff(d) + sumDiff(d) / 100;
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

	return { teams: bestTeams, sc: score(bestTeams[0], bestTeams[1]) };
}

// Print the final teams and their per-category differences.
function logResult(team1, team2) {
	const diffs = categoryDiffs(team1, team2);
	const a = teamTotals(team1);
	const b = teamTotals(team2);

	console.log("=== Team balance ===");
	console.log("Team 1:", team1.map((p) => p.preferred_name).join(", "));
	console.log("Team 2:", team2.map((p) => p.preferred_name).join(", "));
	console.log(`Category differences (target ≤ ${TARGET_DIFFERENCE} each):`);
	for (const key of Object.keys(diffs)) {
		const within = diffs[key] <= TARGET_DIFFERENCE ? "✅" : "⚠️";
		console.log(
			`  ${within} ${CATEGORY_LABELS[key]}: team1=${a[key]}, team2=${b[key]}, diff=${diffs[key]}`,
		);
	}
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

	// Try several annealing runs, keep the best; stop early once every category
	// is within TARGET_DIFFERENCE. First run seeds from a snake draft; later
	// runs from shuffled splits for variety.
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
		if (!best || result.sc < best.sc) best = result;
		if (maxDiff(categoryDiffs(best.teams[0], best.teams[1])) <= TARGET_DIFFERENCE) {
			break;
		}
	}

	const [team1, team2] = best.teams;
	logResult(team1, team2);

	const worst = maxDiff(categoryDiffs(team1, team2));
	if (worst > TARGET_DIFFERENCE) {
		console.warn(
			`Some category is off by ${worst} (target ≤ ${TARGET_DIFFERENCE}). This is the closest split found.`,
		);
	}

	return { team1, team2 };
};
