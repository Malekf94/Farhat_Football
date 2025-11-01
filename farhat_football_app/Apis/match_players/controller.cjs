const pool = require("../../db.cjs");
const queries = require("./queries.cjs");

const getPlayersInMatch = (req, res) => {
	const match_id = parseInt(req.params.match_id);
	pool.query(queries.getPlayersInMatch, [match_id], (error, results) => {
		if (error) throw error;
		res.status(200).json(results.rows);
	});
};

// Adds a player to a match without fetching match price from the DB.
// Assumes 'price' is known at this point (e.g., passed from front end).
const addPlayerToMatch = async (req, res) => {
	const { match_id, player_id, price } = req.body;

	try {
		// Fetch the player's account balance
		const playerResult = await pool.query(
			"SELECT account_balance FROM players WHERE player_id = $1",
			[player_id]
		);

		if (playerResult.rows.length === 0) {
			return res.status(404).json({ error: "Player not found." });
		}

		const accountBalance = parseFloat(playerResult.rows[0].account_balance);
		console.log(accountBalance);

		// Check if balance is too low
		if (accountBalance <= -12) {
			return res.status(400).json({
				error: "Your account balance is too low to join this game.",
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
	const { match_id, player_id } = req.body;

	if (!match_id || !player_id) {
		return res
			.status(400)
			.json({ error: "match_id and player_id are required." });
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
	const { goals, assists, defcons, own_goals, late, team_id } = req.body;

	try {
		const result = await pool.query(queries.updateMatchPlayer, [
			goals !== undefined ? goals : null,
			assists !== undefined ? assists : null,
			defcons !== undefined ? defcons : null,
			own_goals !== undefined ? own_goals : null,
			late !== undefined ? late : null,
			team_id !== undefined ? team_id : null,
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
		const result = await pool.query(queries.getLates);
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

module.exports = {
	addPlayerToMatch,
	removePlayerFromMatch,
	getPlayersInMatch,
	updateMatchPlayer,
	getLates,
	getPlayerAttributesInMatch,
	updateTeamAssignments,
};
