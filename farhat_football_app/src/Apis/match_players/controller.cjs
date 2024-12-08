const pool = require("../../../db.cjs");
const queries = require("./queries.cjs");

const getPlayersInMatch = (req, res) => {
	const match_id = parseInt(req.params.match_id);
	pool.query(queries.getPlayersInMatch, [match_id], (error, results) => {
		if (error) throw error;
		res.status(200).json(results.rows);
	});
	console.log("getting matchplayer");
};

// Adds a player to a match without fetching match price from the DB.
// Assumes 'price' is known at this point (e.g., passed from front end).
const addPlayerToMatch = async (req, res) => {
	const { match_id, player_id, price } = req.body;

	if (!match_id || !player_id || price == null) {
		return res
			.status(400)
			.json({ error: "match_id, player_id, and price are required." });
	}

	try {
		const insertResult = await pool.query(queries.addPlayerToMatch, [
			match_id,
			player_id,
			price,
		]);

		if (insertResult.rows.length === 0) {
			return res.status(400).json({ error: "Failed to add player to match." });
		}

		return res.status(201).json(insertResult.rows[0]);
	} catch (error) {
		console.error("Error adding player to match:", error);
		return res.status(500).json({ error: "An error occurred." });
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

module.exports = {
	addPlayerToMatch,
	removePlayerFromMatch,
	getPlayersInMatch,
};
