const pool = require("../../../db.cjs");
const queries = require("./queries.cjs");

const addPlayer = (req, res) => {
	const {
		first_name,
		last_name,
		preferred_name,
		year_of_birth,
		height,
		weight,
		nationality,
		email,
	} = req.body;

	// Input validation
	if (
		!first_name ||
		!last_name ||
		!preferred_name ||
		!year_of_birth ||
		!height ||
		!weight ||
		!nationality ||
		!email
	) {
		return res.status(400).json({ error: "All fields are required." });
	}

	pool.query(
		queries.addPlayer,
		[
			first_name,
			last_name,
			preferred_name,
			year_of_birth,
			height,
			weight,
			nationality,
			email,
		],
		(error, results) => {
			if (error) {
				console.error(error);
				return res.status(500).json({ error: "Database error occurred." });
			}
			res.status(201).json(results.rows[0]); // Respond with the created player
		}
	);
};

const getPlayers = (req, res) => {
	pool.query(queries.getPlayers, (error, results) => {
		if (error) throw error;
		res.status(200).json(results.rows);
	});
	console.log("getting players");
};

const getPlayer = (req, res) => {
	const player_id = parseInt(req.params.player_id);
	pool.query(queries.getPlayer, [player_id], (error, results) => {
		if (error) throw error;
		res.status(200).json(results.rows);
	});
	console.log("getting player");
};

const getPlayerStats = (req, res) => {
	const playerId = parseInt(req.params.player_id);
	pool.query(queries.getPlayerStats, [playerId], (error, results) => {
		if (error) {
			console.error("Error fetching player stats:", error);
			res
				.status(500)
				.json({ error: "An error occurred while fetching stats." });
		} else {
			res.status(200).json(results.rows);
		}
	});
};

module.exports = { getPlayerStats };

module.exports = {
	getPlayers,
	addPlayer,
	getPlayer,
	getPlayerStats,
};
