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

// Update Player
const updatePlayer = async (req, res) => {
	const { player_id } = req.params;
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

	try {
		const result = await pool.query(queries.updatePlayer, [
			first_name || null,
			last_name || null,
			preferred_name || null,
			year_of_birth || null,
			height || null,
			weight || null,
			nationality || null,
			email || null,
			player_id,
		]);

		if (result.rows.length === 0) {
			return res.status(404).json({ error: "Player not found." });
		}

		return res.status(200).json(result.rows);
	} catch (error) {
		console.error("Error updating player:", error);
		return res.status(500).json({ error: "An error occurred." });
	}
};

const updatePlayerBalance = async (req, res) => {
	// const { player_id } = req.params;
	const { amount, player_id } = req.body;

	try {
		const result = await pool.query(queries.updatePlayerBalance, [
			amount,
			player_id,
		]);

		if (result.rowCount === 0) {
			return res.status(404).json({ error: "Player not found." });
		}

		res.status(200).json({
			message: "Amount subtracted successfully.",
			new_balance: result.rows[0].account_balance,
		});
	} catch (error) {
		console.error("Error subtracting from account balance:", error);
		res.status(500).json({
			error: "An error occurred while subtracting from the account balance.",
		});
	}
};

const getPayments = async (req, res) => {
	const { player_id } = req.params;

	try {
		const result = await pool.query(queries.getPayments, [player_id]);
		res.status(200).json(result.rows);
	} catch (error) {
		console.error("Error fetching payments:", error.message);
		res.status(500).json({ error: "Failed to fetch payments." });
	}
};

const getAccountBalance = async (req, res) => {
	const { player_id } = req.params;

	try {
		const result = await pool.query(queries.getAccountBalance, [player_id]);
		res.status(200).json(result.rows[0]);
	} catch (error) {
		console.error("Error fetching balance:", error.message);
		res.status(500).json({ error: "Failed to fetch balance." });
	}
};

const processPlayerPayments = async (req, res) => {
	const { player_id } = req.params;

	try {
		const result = await pool.query(queries.processPlayerPayments, [player_id]);

		if (result.rowCount === 0) {
			return res.status(404).json({ error: "Player not found." });
		}

		res.status(200).json({
			message: "Player balance updated successfully.",
			new_balance: result.rows[0].account_balance,
		});
	} catch (error) {
		console.error("Error processing payments:", error.message);
		res.status(500).json({ error: "Internal server error." });
	}
};

module.exports = {
	getPlayers,
	addPlayer,
	getPlayer,
	getPlayerStats,
	updatePlayer,
	updatePlayerBalance,
	getAccountBalance,
	getPayments,
	processPlayerPayments,
};
