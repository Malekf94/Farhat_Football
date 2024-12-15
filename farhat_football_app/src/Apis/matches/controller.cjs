const pool = require("../../../db.cjs");
const matchQueries = require("./queries.cjs");
const matchPlayerQueries = require("../match_players/queries.cjs");

const getMatches = (req, res) => {
	pool.query(matchQueries.getMatches, (error, results) => {
		if (error) throw error;
		res.status(200).json(results.rows);
	});
	console.log("getting matches");
};
const getPendingMatches = async (req, res) => {
	try {
		const result = await pool.query(matchQueries.getPendingMatches);
		res.status(200).json(result.rows);
	} catch (error) {
		console.error("Error fetching pending matches:", error);
		res
			.status(500)
			.json({ error: "An error occurred while fetching pending matches." });
	}
};

const getCompletedMatches = async (req, res) => {
	try {
		const result = await pool.query(matchQueries.getCompletedMatches);
		res.status(200).json(result.rows);
	} catch (error) {
		console.error("Error fetching completed matches:", error);
		res
			.status(500)
			.json({ error: "An error occurred while fetching completed matches." });
	}
};

const getFriendlyMatches = async (req, res) => {
	try {
		const result = await pool.query(matchQueries.getFriendlyMatches);
		res.status(200).json(result.rows);
	} catch (error) {
		console.error("Error fetching friendly matches:", error);
		res
			.status(500)
			.json({ error: "An error occurred while fetching friendly matches." });
	}
};

const getInProgressMatches = async (req, res) => {
	try {
		const result = await pool.query(matchQueries.getInProgressMatches);
		res.status(200).json(result.rows);
	} catch (error) {
		console.error("Error fetching in-progress matches:", error);
		res
			.status(500)
			.json({ error: "An error occurred while fetching in-progress matches." });
	}
};

const getMatchById = (req, res) => {
	const match_id = parseInt(req.params.match_id);
	pool.query(matchQueries.getMatchById, [match_id], (error, results) => {
		if (error) throw error;
		res.status(200).json(results.rows);
	});
	console.log("getting match");
};

const createMatch = async (req, res) => {
	const {
		match_date,
		match_time,
		number_of_players,
		pitch_id,
		match_status,
		signin_begin_time,
	} = req.body;

	if (
		!match_date ||
		!match_time ||
		!number_of_players ||
		!pitch_id ||
		!match_status ||
		!signin_begin_time
	) {
		return res.status(400).json({ error: "All fields are required." });
	}

	try {
		// 1. Get pitch price_per_person
		const pitchResult = await pool.query(matchQueries.getPitchPrice, [
			pitch_id,
		]);
		if (pitchResult.rows.length === 0) {
			return res.status(404).json({ error: "Pitch not found." });
		}
		const pitchPrice = pitchResult.rows[0].price;

		// 2. Create match using pitchPrice as the match price
		const insertResult = await pool.query(matchQueries.createMatch, [
			match_date,
			match_time,
			pitchPrice,
			number_of_players,
			pitch_id,
			match_status,
			signin_begin_time,
		]);

		const newMatch = insertResult.rows[0];
		return res.status(201).json(newMatch);
	} catch (error) {
		console.error("Error creating match:", error);
		return res
			.status(500)
			.json({ error: "An error occurred while creating the match." });
	}
};

// Update Match
const updateMatch = async (req, res) => {
	const { match_id } = req.params;
	const {
		match_status,
		match_date,
		match_time,
		number_of_players,
		price,
		signin_begin_time,
	} = req.body;

	try {
		const result = await pool.query(matchQueries.updateMatch, [
			match_status || null,
			match_date || null,
			match_time || null,
			number_of_players || null,
			price || null,
			signin_begin_time || null,
			match_id,
		]);

		if (result.rows.length === 0) {
			return res.status(404).json({ error: "Match not found." });
		}

		return res.status(200).json(result.rows);
	} catch (error) {
		console.error("Error updating match:", error);
		return res.status(500).json({ error: "An error occurred." });
	}
};

const chargePlayers = async (req, res) => {
	const { match_id } = req.params;
	const { price } = req.body;

	try {
		const players = await pool.query(matchPlayerQueries.getMatchPlayers, [
			match_id,
		]);

		if (players.rows.length === 0) {
			return res.status(404).json({ error: "No players found for the match." });
		}

		for (const player of players.rows) {
			const lateFee = player.late ? 1 : 0;
			const totalCharge = -(parseFloat(price) + lateFee);

			const result = await pool.query(matchPlayerQueries.updatePlayerBalance, [
				totalCharge,
				player.player_id,
			]);

			if (result.rowCount === 0) {
				console.error(`Failed to charge player_id: ${player.player_id}`);
			}
		}

		res.status(200).json({ message: "Players charged successfully." });
	} catch (error) {
		console.error("Error in chargePlayers:", error);
		res
			.status(500)
			.json({ error: "An error occurred while charging players." });
	}
};

module.exports = {
	createMatch,
	getMatches,
	getMatchById,
	createMatch,
	getPendingMatches,
	getCompletedMatches,
	getFriendlyMatches,
	getInProgressMatches,
	updateMatch,
	chargePlayers,
};
