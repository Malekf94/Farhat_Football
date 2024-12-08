const pool = require("../../../db.cjs");
const queries = require("./queries.cjs");

const getMatches = (req, res) => {
	pool.query(queries.getMatches, (error, results) => {
		if (error) throw error;
		res.status(200).json(results.rows);
	});
	console.log("getting matches");
};
const getPendingMatches = (req, res) => {
	pool.query(queries.getPendingMatches, (error, results) => {
		if (error) throw error;
		res.status(200).json(results.rows);
	});
};

const getCompletedMatches = (req, res) => {
	pool.query(queries.getCompletedMatches, (error, results) => {
		if (error) throw error;
		res.status(200).json(results.rows);
	});
};

const getMatchById = (req, res) => {
	const match_id = parseInt(req.params.match_id);
	pool.query(queries.getMatchById, [match_id], (error, results) => {
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
		const pitchResult = await pool.query(queries.getPitchPrice, [pitch_id]);
		if (pitchResult.rows.length === 0) {
			return res.status(404).json({ error: "Pitch not found." });
		}
		const pitchPrice = pitchResult.rows[0].price;

		// 2. Create match using pitchPrice as the match price
		const insertResult = await pool.query(queries.createMatch, [
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

module.exports = {
	createMatch,
	getMatches,
	getMatchById,
	createMatch,
	getPendingMatches,
	getCompletedMatches,
};
