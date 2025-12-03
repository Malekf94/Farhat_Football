const pool = require("../../db.cjs");
const queries = require("./queries.cjs");

const addPlayer = (req, res) => {
	const { first_name, last_name, preferred_name, year_of_birth, email } =
		req.body;

	// Input validation
	if (
		!first_name ||
		!last_name ||
		!preferred_name ||
		!year_of_birth ||
		!email
	) {
		return res.status(400).json({ error: "All fields are required." });
	}

	pool.query(
		queries.addPlayer,
		[first_name, last_name, preferred_name, year_of_birth, email],
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
};

const getPlayer = (req, res) => {
	const player_id = parseInt(req.params.player_id);
	pool.query(queries.getPlayer, [player_id], (error, results) => {
		if (error) throw error;
		res.status(200).json(results.rows);
	});
};

const getOwnPlayer = (req, res) => {
	const player_id = parseInt(req.params.player_id);
	pool.query(queries.getOwnPlayer, [player_id], (error, results) => {
		if (error) throw error;
		res.status(200).json(results.rows);
	});
};
const getPlayerStats = async (req, res) => {
	const playerId = parseInt(req.params.player_id);
	try {
		const result = await pool.query(queries.getPlayerStats, [playerId]);

		const balanceResult = await pool.query(queries.getAccountBalance, [
			playerId,
		]);

		const stats = result.rows[0] || {
			total_goals: 0,
			total_assists: 0,
			total_defcons: 0,
			total_chancescreated: 0,
			total_own_goals: 0,
			total_matches: 0,
		};

		const account_balance = balanceResult.rows[0]?.account_balance || 0;

		res.json({ ...stats, account_balance });
	} catch (err) {
		console.error("Error fetching player stats:", err);
		res.status(500).json({ error: "Failed to fetch player stats" });
	}
};

const getMonthlyPlayerStats = (req, res) => {
	const playerId = parseInt(req.params.player_id);
	pool.query(queries.getMonthlyPlayerStats, [playerId], (error, results) => {
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
	const { preferred_name, year_of_birth } = req.body;

	try {
		const result = await pool.query(queries.updatePlayer, [
			preferred_name || null,
			year_of_birth || null,
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

const getNegativeBalance = async (req, res) => {
	try {
		const query = queries.getNegativeBalance;
		const result = await pool.query(query);
		res.status(200).json(result.rows);
	} catch (error) {
		console.error("Error fetching players with negative balances:", error);
		res.status(500).json({ error: "Failed to fetch negative balances" });
	}
};

// API endpoint for handling user signups
const auth0Signup = async (req, res) => {
	const { email, first_name, last_name, preferred_name, year_of_birth } =
		req.body;

	// Input validation
	if (
		!email ||
		!first_name ||
		!last_name ||
		!preferred_name ||
		!year_of_birth
	) {
		return res.status(400).json({ error: "All fields are required." });
	}

	if (!/^\S+@\S+\.\S+$/.test(email)) {
		return res.status(400).json({ error: "Invalid email format." });
	}

	if (year_of_birth < 1900 || year_of_birth > new Date().getFullYear()) {
		return res.status(400).json({
			error: "Invalid year of birth. Must be between 1900 and current year.",
		});
	}

	// Proceed to database operations
	try {
		// Check if the user already exists
		const existingUser = await pool.query(
			"SELECT * FROM players WHERE email = $1",
			[email]
		);

		if (existingUser.rows.length > 0) {
			// User already exists
			return res
				.status(200)
				.json({ message: "User already exists in the database." });
		}

		// Insert the new user
		const newUser = await pool.query(queries.addAuthPlayer, [
			email,
			first_name,
			last_name,
			preferred_name,
			year_of_birth,
		]);

		// Respond with the created player
		return res.status(201).json(newUser.rows[0]);
	} catch (error) {
		console.error("Error adding user to the database:", error);
		return res.status(500).json({ error: "Internal Server Error" });
	}
};

const checkEmail = async (req, res) => {
	const { email } = req.query;

	if (!email) {
		return res.status(400).json({ error: "Email is required" });
	}

	try {
		const result = await pool.query(queries.checkEmailExists, [email]);

		if (result.rows.length > 0) {
			// User exists
			return res.json({
				exists: true,
				player_id: result.rows[0].player_id,
				is_admin: result.rows[0].is_admin,
			});
		} else {
			// User does not exist
			return res.json({ exists: false });
		}
	} catch (error) {
		console.error("Error checking user in DB:", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

module.exports = {
	getPlayers,
	addPlayer,
	getPlayer,
	getOwnPlayer,
	getPlayerStats,
	updatePlayer,
	updatePlayerBalance,
	getAccountBalance,
	getPayments,
	processPlayerPayments,
	getNegativeBalance,
	auth0Signup,
	checkEmail,
	getMonthlyPlayerStats,
};
