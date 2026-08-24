const pool = require("../../db.cjs");
const queries = require("./queries.cjs");
const banQueries = require("../bans/queries.cjs");
const { getCaller } = require("../auth/requireHostAdmin.cjs");

// Auto-ban policy: this many lates within the window (days) triggers a ban of
// banDays. Counted per host, resetting after each auto-ban.
const AUTO_BAN = { lates: 3, windowDays: 21, banDays: 7 };

// After stats are saved, ban anyone who has hit the late threshold at this host.
async function runAutoLateBans(match_id, players) {
	const lateOnes = players.filter((p) => p.late === true);
	if (lateOnes.length === 0) return;

	const hostRes = await pool.query(
		"SELECT host_id FROM matches WHERE match_id = $1",
		[match_id],
	);
	const hostId = hostRes.rows[0]?.host_id ?? null;

	for (const p of lateOnes) {
		try {
			const countRes = await pool.query(banQueries.countRecentLates, [
				p.player_id,
				hostId,
				AUTO_BAN.windowDays,
			]);
			if (parseInt(countRes.rows[0].lates, 10) < AUTO_BAN.lates) continue;

			// Don't stack bans on an already-banned player.
			const existing = await pool.query(banQueries.hasActiveBan, [
				p.player_id,
				hostId,
			]);
			if (existing.rows.length > 0) continue;

			const bannedUntil = new Date(
				Date.now() + AUTO_BAN.banDays * 24 * 60 * 60 * 1000,
			);
			await pool.query(banQueries.createBan, [
				p.player_id,
				hostId,
				bannedUntil,
				`Automatic: ${AUTO_BAN.lates}+ lates within ${AUTO_BAN.windowDays} days`,
				"auto_late",
				null,
			]);
			console.log(`⛔ Auto-banned player ${p.player_id} for repeated lates`);
		} catch (err) {
			console.error("Auto late-ban check failed:", err);
		}
	}
}

const getPlayersInMatch = async (req, res) => {
	const match_id = parseInt(req.params.match_id);
	try {
		const results = await pool.query(queries.getPlayersInMatch, [match_id]);
		res.status(200).json(results.rows);
	} catch (error) {
		console.error("Error fetching players in match:", error);
		res.status(500).json({ error: "Failed to fetch players in match." });
	}
};

// Adds a player to a match. The price charged is read from the match, never
// taken from the request — match_players.price is what the finalisation step
// later charges. player_id is the target validated by requireSelfOrHostAdmin.
const addPlayerToMatch = async (req, res) => {
	const { match_id } = req.body;
	const player_id = req.targetPlayerId;

	try {
		const matchResult = await pool.query(
			"SELECT host_id, price FROM matches WHERE match_id = $1",
			[match_id],
		);
		if (matchResult.rows.length === 0) {
			return res.status(404).json({ error: "Match not found." });
		}
		const { host_id: hostId, price } = matchResult.rows[0];

		// Fetch the player's account balance
		const playerResult = await pool.query(
			"SELECT account_balance FROM players WHERE player_id = $1",
			[player_id],
		);

		if (playerResult.rows.length === 0) {
			return res.status(404).json({ error: "Player not found." });
		}

		const accountBalance = parseFloat(playerResult.rows[0].account_balance);

		// Check if balance is too low
		if (accountBalance <= -12) {
			return res.status(400).json({
				error: "Your account balance is too low to join this game.",
			});
		}

		// Block banned players (checked against this match's host).
		const banResult = await pool.query(
			`SELECT banned_until FROM bans
			 WHERE player_id = $1 AND active = true AND now() < banned_until
			   AND (host_id = $2 OR host_id IS NULL)
			 ORDER BY banned_until DESC LIMIT 1`,
			[player_id, hostId],
		);
		if (banResult.rows.length > 0) {
			return res.status(403).json({
				error: "You're currently banned and can't join this game.",
				banned_until: banResult.rows[0].banned_until,
			});
		}

		// Add the player to the match if balance is sufficient
		const result = await pool.query(queries.addPlayerToMatch, [
			match_id,
			player_id,
			price,
		]);

		res.status(201).json(result.rows[0]);
	} catch (error) {
		console.error("Error adding player to match:", error);
		res
			.status(500)
			.json({ error: "An error occurred while joining the match." });
	}
};

// Removes a player from a match (opting out)
const removePlayerFromMatch = async (req, res) => {
	const { match_id } = req.body;
	const player_id = req.targetPlayerId;

	if (!match_id) {
		return res.status(400).json({ error: "match_id is required." });
	}

	try {
		const deleteResult = await pool.query(queries.removePlayerFromMatch, [
			match_id,
			player_id,
		]);

		if (deleteResult.rows.length === 0) {
			return res.status(404).json({ error: "Player not found in this match." });
		}

		return res.status(200).json({ message: "Player removed from the match." });
	} catch (error) {
		console.error("Error removing player from match:", error);
		return res.status(500).json({ error: "An error occurred." });
	}
};

// Update Match Player (e.g. goals, assists, late)
const updateMatchPlayer = async (req, res) => {
	const { match_id, player_id } = req.params;
	const {
		goals,
		assists,
		defcons,
		chancescreated,
		own_goals,
		late,
		team_id,
		rating,
	} = req.body;

	try {
		const result = await pool.query(queries.updateMatchPlayer, [
			goals !== undefined ? goals : null,
			assists !== undefined ? assists : null,
			defcons !== undefined ? defcons : null,
			chancescreated !== undefined ? chancescreated : null,
			own_goals !== undefined ? own_goals : null,
			late !== undefined ? late : null,
			team_id !== undefined ? team_id : null,
			rating !== undefined ? rating : null,
			match_id,
			player_id,
		]);

		if (result.rows.length === 0) {
			return res.status(404).json({ error: "Match player record not found." });
		}

		return res.status(200).json(result.rows);
	} catch (error) {
		console.error("Error updating match player:", error);
		return res.status(500).json({ error: "An error occurred." });
	}
};

const getLates = async (req, res) => {
	try {
		const { host_id } = req.query;
		const result = await pool.query(queries.getLates, [host_id || null]);
		res.status(200).json(result.rows);
	} catch (error) {
		console.error("Error fetching late players:", error);
		res
			.status(500)
			.json({ error: "An error occurred while fetching late players." });
	}
};

const getPlayerAttributesInMatch = async (req, res) => {
	const { match_id } = req.params;
	try {
		const result = await pool.query(queries.getPlayerAttributesInMatch, [
			match_id,
		]);
		res.status(200).json(result.rows);
	} catch (error) {
		console.error("Error fetching players in match:", error);
		res
			.status(500)
			.json({ error: "An error occurred while fetching players." });
	}
};

// const updateTeamAssignments = async (req, res) => {
// 	const { match_id } = req.params;

// 	try {
// 		// Step 1: Get the player attributes from the match
// 		const { rows: playersAttributes } = await pool.query(
// 			queries.getPlayerAttributesInMatch,
// 			[match_id]
// 		);

// 		// Step 2: Run the randomiser function to distribute players into two teams
// 		const { team1, team2 } = randomiser(playersAttributes);

// 		// Step 3: Extract player IDs for each team
// 		const team1Ids = team1.map((player) => player.player_id);
// 		const team2Ids = team2.map((player) => player.player_id);

// 		// Step 4: Run the update query to set team_id
// 		await pool.query(queries.updateTeamAssignments, [
// 			team1Ids,
// 			team2Ids,
// 			match_id,
// 		]);

// 		// Step 5: Respond with success
// 		res
// 			.status(200)
// 			.json({ message: "Teams successfully updated", team1, team2 });
// 	} catch (error) {
// 		console.error("Error updating team assignments:", error);
// 		res
// 			.status(500)
// 			.json({ error: "An error occurred while updating team assignments." });
// 	}
// };

const updateTeamAssignments = async (req, res) => {
	const { match_id } = req.params;
	const { team1, team2 } = req.body;

	try {
		await pool.query(queries.updateTeamAssignments, [team1, team2, match_id]);

		res.status(200).json({ message: "Teams successfully updated" });
	} catch (error) {
		console.error("Error updating team assignments:", error);
		res
			.status(500)
			.json({ error: "An error occurred while updating team assignments." });
	}
};
const batchUpdateMatchPlayers = async (req, res) => {
	const { match_id } = req.params;
	const { players } = req.body; // array of { player_id, goals, assists, defcons, chancescreated, own_goals, late, team_id }

	if (!Array.isArray(players) || players.length === 0) {
		return res.status(400).json({ error: "players array is required." });
	}

	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		for (const p of players) {
			await client.query(
				`UPDATE match_players
         SET goals = COALESCE($1, goals),
             assists = COALESCE($2, assists),
             defcons = COALESCE($3, defcons),
             chancescreated = COALESCE($4, chancescreated),
             own_goals = COALESCE($5, own_goals),
             late = COALESCE($6, late),
             team_id = COALESCE($7, team_id),
             rating = COALESCE($8, rating)
         WHERE match_id = $9 AND player_id = $10`,
				[
					p.goals ?? null,
					p.assists ?? null,
					p.defcons ?? null,
					p.chancescreated ?? null,
					p.own_goals ?? null,
					p.late ?? null,
					p.team_id ?? null,
					p.rating ?? null,
					match_id,
					p.player_id,
				],
			);
		}
		await client.query("COMMIT");

		// After the stats commit, apply automatic late-bans (best-effort — a
		// failure here shouldn't fail the stats save).
		await runAutoLateBans(match_id, players);

		res.status(200).json({ message: "Stats updated successfully." });
	} catch (error) {
		await client.query("ROLLBACK");
		console.error("Error batch updating match players:", error);
		res.status(500).json({ error: "Failed to update stats." });
	} finally {
		client.release();
	}
};
// ---- Player-voted ratings ----

// A player submits their ratings of the other players in a completed match.
const submitRatings = async (req, res) => {
	const { match_id } = req.params;
	const { ratings } = req.body; // [{ ratee_id, rating }]

	if (!Array.isArray(ratings)) {
		return res.status(400).json({ error: "ratings array is required." });
	}

	try {
		const caller = await getCaller(req);
		if (!caller) return res.status(403).json({ error: "Could not verify identity." });

		const statusRes = await pool.query(queries.getMatchStatus, [match_id]);
		const status = statusRes.rows[0]?.match_status;
		if (!["completed", "friendly"].includes(status)) {
			return res
				.status(400)
				.json({ error: "Voting is only open once a match is completed." });
		}

		const played = await pool.query(queries.playedInMatch, [
			match_id,
			caller.player_id,
		]);
		if (played.rows.length === 0) {
			return res
				.status(403)
				.json({ error: "Only players who played in this match can rate it." });
		}

		const client = await pool.connect();
		try {
			await client.query("BEGIN");
			for (const r of ratings) {
				const rateeId = Number(r.ratee_id);
				const value = parseFloat(r.rating);
				if (rateeId === caller.player_id) continue; // no self-rating
				if (Number.isNaN(value) || value < 1 || value > 10) continue;

				const rateePlayed = await client.query(queries.playedInMatch, [
					match_id,
					rateeId,
				]);
				if (rateePlayed.rows.length === 0) continue;

				await client.query(queries.upsertRating, [
					match_id,
					caller.player_id,
					rateeId,
					value,
				]);
			}
			await client.query("COMMIT");
			res.json({ message: "Ratings submitted." });
		} catch (err) {
			await client.query("ROLLBACK");
			throw err;
		} finally {
			client.release();
		}
	} catch (error) {
		console.error("Error submitting ratings:", error);
		res.status(500).json({ error: "Failed to submit ratings." });
	}
};

// The caller's own submitted votes for a match (to pre-fill the voting UI).
const getMyRatings = async (req, res) => {
	try {
		const caller = await getCaller(req);
		if (!caller) return res.status(403).json({ error: "Could not verify identity." });
		const result = await pool.query(queries.getMyRatings, [
			req.params.match_id,
			caller.player_id,
		]);
		res.json(result.rows);
	} catch (error) {
		console.error("Error fetching own ratings:", error);
		res.status(500).json({ error: "Failed to fetch ratings." });
	}
};

// Admin: the suggested (average) rating per player from all votes.
const getSuggestedRatings = async (req, res) => {
	try {
		const result = await pool.query(queries.getSuggestedRatings, [
			req.params.match_id,
		]);
		res.json(result.rows);
	} catch (error) {
		console.error("Error fetching suggested ratings:", error);
		res.status(500).json({ error: "Failed to fetch suggested ratings." });
	}
};

// Superadmin: every individual vote for a match (deanonymised export).
const getMatchRatingsDetailed = async (req, res) => {
	try {
		const result = await pool.query(queries.getMatchRatingsDetailed, [
			req.params.match_id,
		]);
		res.json(result.rows);
	} catch (error) {
		console.error("Error fetching match ratings:", error);
		res.status(500).json({ error: "Failed to fetch match ratings." });
	}
};

module.exports = {
	submitRatings,
	getMyRatings,
	getSuggestedRatings,
	getMatchRatingsDetailed,
	addPlayerToMatch,
	removePlayerFromMatch,
	getPlayersInMatch,
	updateMatchPlayer,
	batchUpdateMatchPlayers,
	getLates,
	getPlayerAttributesInMatch,
	updateTeamAssignments,
};
