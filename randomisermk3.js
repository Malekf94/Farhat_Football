// import { randomiser } from "./randomisermk2";

// export const randomiserMk3 = (playersAttributes) => {
// 	let players = [...playersAttributes];
// 	let numberOfPlayers = players.length;

// 	// const fair = false;
// 	let count = 0;

// 	while (count < 20) {
// 		// Splitting the players into two teams
// 		function shuffle(array) {
// 			for (let i = array.length - 1; i > 0; i--) {
// 				const j = Math.floor(Math.random() * (i + 1)); // random index
// 				[array[i], array[j]] = [array[j], array[i]]; // swap
// 			}
// 			return array;
// 		}

// 		let shuffledPlayers = shuffle(players);

// 		const team1 = shuffledPlayers.slice(0, numberOfPlayers / 2);
// 		const team2 = shuffledPlayers.slice(numberOfPlayers / 2);

// 		//adding total attributes
// 		let team1Total = team1.reduce((total, player) => {
// 			return (
// 				total +
// 				Object.entries(player)
// 					.filter(
// 						([key, val]) =>
// 							typeof val === "number" &&
// 							key !== "player_id" &&
// 							key !== "mental" &&
// 							key !== "goalkeeping" &&
// 							key !== "team_id",
// 					)
// 					.reduce((sum, [_, val]) => sum + val, 0)
// 			);
// 		}, 0);
// 		let team2Total = team2.reduce((total, player) => {
// 			return (
// 				total +
// 				Object.entries(player)
// 					.filter(
// 						([key, val]) =>
// 							typeof val === "number" &&
// 							key !== "player_id" &&
// 							key !== "mental" &&
// 							key !== "goalkeeping" &&
// 							key !== "team_id",
// 					)
// 					.reduce((sum, [_, val]) => sum + val, 0)
// 			);
// 		}, 0);

// 		// Sum a stat for a given team
// 		function getTeamStat(players, teamId, stat) {
// 			return players
// 				.filter((p) => p.team_id === teamId)
// 				.reduce((sum, p) => sum + (p[stat] || 0), 0);
// 		}

// 		let team1Mental = getTeamStat(team1, 1, "mental");
// 		let team2Mental = getTeamStat(team2, 2, "mental");

// 		let team1Goalkeeping = getTeamStat(team1, 1, "goalkeeping");
// 		let team2Goalkeeping = getTeamStat(team2, 2, "goalkeeping");

// 		let team1Teamwork = getTeamStat(team1, 1, "teamwork");
// 		let team2Teamwork = getTeamStat(team2, 2, "teamwork");

// 		//Calculating the difference for mental, goalkeeping and total attributes
// 		let mentalDifference = Math.abs(team1Mental - team2Mental);
// 		let goalkeepingDifference = Math.abs(team1Goalkeeping - team2Goalkeeping);
// 		let teamworkDifference = Math.abs(team1Teamwork - team2Teamwork);
// 		let totalAttributesDifference = Math.abs(team1Total - team2Total);

// 		console.log(
// 			mentalDifference,
// 			goalkeepingDifference,
// 			teamworkDifference,
// 			totalAttributesDifference,
// 		);
// 		if (
// 			goalkeepingDifference < 10 &&
// 			mentalDifference < 15 &&
// 			teamworkDifference < 10 &&
// 			totalAttributesDifference < 30
// 		) {
// 			return { team1, team2 };
// 		} else {
// 			count++;
// 		}
// 	}

// 	return randomiser(playersAttributes);

// 	// return { team1, team2 };
// };

/**
 * randomiserMk3 — multi-objective balanced team splitter.
 *
 * Balances four things simultaneously:
 *   1. Total outfield stats (finishing, passing, shooting, etc.)
 *   2. Teamwork
 *   3. Mental
 *   4. Goalkeeping
 *
 * Strategy: simulated annealing over random swaps.
 * - Start from a greedy snake-draft split (good starting point).
 * - Score the split using a weighted penalty across all four objectives.
 * - Repeatedly try random single-player swaps between teams.
 * - Keep a swap if it improves the score; occasionally keep bad swaps early
 *   on (annealing) to escape local optima.
 * - Return the best split found.
 *
 * Deterministic enough to always produce a well-balanced result,
 * but with enough randomness that teams aren't identical every week.
 */

const SOFT_STATS = new Set(["player_id", "team_id"]);
const SOFT_ONLY = new Set(["mental", "goalkeeping", "teamwork"]);

// Weights for each objective — tweak these to change what matters most
const WEIGHTS = {
	total: 1.0, // outfield stats total
	teamwork: 2.5, // teamwork difference (higher = punish imbalance more)
	mental: 2.0, // mental difference
	goalkeeping: 2.5, // goalkeeping difference
};

function getStats(player) {
	let outfield = 0;
	for (const [key, val] of Object.entries(player)) {
		if (
			typeof val === "number" &&
			!SOFT_STATS.has(key) &&
			!SOFT_ONLY.has(key)
		) {
			outfield += val;
		}
	}
	return {
		outfield,
		teamwork: player.teamwork ?? 0,
		mental: player.mental ?? 0,
		goalkeeping: player.goalkeeping ?? 0,
	};
}

function teamTotals(team) {
	let outfield = 0,
		teamwork = 0,
		mental = 0,
		goalkeeping = 0;
	for (const p of team) {
		const s = getStats(p);
		outfield += s.outfield;
		teamwork += s.teamwork;
		mental += s.mental;
		goalkeeping += s.goalkeeping;
	}
	return { outfield, teamwork, mental, goalkeeping };
}

function penalty(t1, t2) {
	const a = teamTotals(t1);
	const b = teamTotals(t2);
	return (
		WEIGHTS.total * Math.abs(a.outfield - b.outfield) +
		WEIGHTS.teamwork * Math.abs(a.teamwork - b.teamwork) +
		WEIGHTS.mental * Math.abs(a.mental - b.mental) +
		WEIGHTS.goalkeeping * Math.abs(a.goalkeeping - b.goalkeeping)
	);
}

function snakeDraft(players) {
	// Sort best → worst by outfield stats, then snake-draft into two teams
	const sorted = [...players].sort(
		(a, b) => getStats(b).outfield - getStats(a).outfield,
	);
	const t1 = [],
		t2 = [];
	sorted.forEach((p, i) => {
		// Snake pattern: 0→t1, 1→t2, 2→t2, 3→t1, 4→t1, 5→t2 ...
		const round = Math.floor(i / 2);
		const pick = i % 2;
		(round % 2 === 0 ? (pick === 0 ? t1 : t2) : pick === 0 ? t2 : t1).push(p);
	});
	return [t1, t2];
}

export const randomiserMk3 = (playersAttributes) => {
	const players = [...playersAttributes];
	const n = players.length;
	const half = Math.floor(n / 2);

	// Players with zero outfield total haven't been rated yet.
	// Substitute the per-attribute average from rated players so they
	// are treated as neutral unknowns and distributed evenly.
	const rated = players.filter((p) => getStats(p).outfield > 0);
	let effective = players;

	if (rated.length > 0 && rated.length < players.length) {
		const sampleKeys = Object.keys(rated[0]).filter(
			(k) => typeof rated[0][k] === "number" && k !== "player_id" && k !== "team_id",
		);
		const avgAttrs = {};
		for (const key of sampleKeys) {
			avgAttrs[key] = Math.round(
				rated.reduce((sum, p) => sum + Number(p[key] || 0), 0) / rated.length,
			);
		}
		effective = players.map((p) =>
			getStats(p).outfield === 0 ? { ...p, ...avgAttrs } : p,
		);
	}

	// --- Seed with a greedy snake draft ---
	let [team1, team2] = snakeDraft(effective);
	let bestPenalty = penalty(team1, team2);
	let bestTeams = [team1.map((p) => ({ ...p })), team2.map((p) => ({ ...p }))];

	// --- Simulated annealing ---
	// 800 iterations is plenty for groups up to ~20 players
	const ITERATIONS = 800;
	let temperature = 50; // starts high (accepts worse swaps), cools to 0

	for (let iter = 0; iter < ITERATIONS; iter++) {
		temperature = 50 * (1 - iter / ITERATIONS); // linear cooling

		// Pick one random player from each team and try swapping them
		const i1 = Math.floor(Math.random() * team1.length);
		const i2 = Math.floor(Math.random() * team2.length);

		// Swap
		[team1[i1], team2[i2]] = [team2[i2], team1[i1]];

		const newPenalty = penalty(team1, team2);
		const delta = newPenalty - bestPenalty;

		if (delta < 0) {
			// Improvement — always keep
			bestPenalty = newPenalty;
			bestTeams = [team1.map((p) => ({ ...p })), team2.map((p) => ({ ...p }))];
		} else if (
			temperature > 0 &&
			Math.random() < Math.exp(-delta / temperature)
		) {
			// Occasionally accept a worse swap early on (escape local optima)
			// — don't update bestTeams, just keep exploring from here
		} else {
			// Reject — swap back
			[team1[i1], team2[i2]] = [team2[i2], team1[i1]];
		}
	}

	// Enforce equal team sizes if odd number of players
	// (extra player stays in team1 as snake draft left them)
	return { team1: bestTeams[0], team2: bestTeams[1] };
};
