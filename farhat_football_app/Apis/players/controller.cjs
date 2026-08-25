const pool = require("../../db.cjs");
const queries = require("./queries.cjs");
const { resolvePlayer, UNRESOLVED } = require("../auth/identity.cjs");

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
		},
	);
};

const getPlayers = async (req, res) => {
	try {
		const results = await pool.query(queries.getPlayers);
		res.status(200).json(results.rows);
	} catch (error) {
		console.error("Error fetching players:", error);
		res.status(500).json({ error: "Failed to fetch players." });
	}
};

const getPlayer = async (req, res) => {
	const player_id = parseInt(req.params.player_id);
	try {
		const results = await pool.query(queries.getPlayer, [player_id]);
		res.status(200).json(results.rows);
	} catch (error) {
		console.error("Error fetching player:", error);
		res.status(500).json({ error: "Failed to fetch player." });
	}
};

const getOwnPlayer = async (req, res) => {
	const player_id = parseInt(req.params.player_id);
	try {
		const results = await pool.query(queries.getOwnPlayer, [player_id]);
		res.status(200).json(results.rows);
	} catch (error) {
		console.error("Error fetching own player:", error);
		res.status(500).json({ error: "Failed to fetch player details." });
	}
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

	const birthYear = Number(year_of_birth);
	if (
		!Number.isInteger(birthYear) ||
		birthYear <= 1970 ||
		birthYear >= 2009
	) {
		return res.status(400).json({
			error: "Invalid year of birth. Must be between 1971 and 2008.",
		});
	}

	// Proceed to database operations
	try {
		// Check if the user already exists
		const existingUser = await pool.query(
			"SELECT * FROM players WHERE email = $1",
			[email],
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
			birthYear,
		]);

		// Respond with the created player
		return res.status(201).json(newUser.rows[0]);
	} catch (error) {
		console.error("Error adding user to the database:", error);
		return res.status(500).json({ error: "Internal Server Error" });
	}
};

// Who am I? Answers only about the caller (SEC-008).
//
// This used to take an email from the QUERY STRING and return that player's id
// and admin flags, so any token holder could enumerate accounts and read
// another player's privileges by asking about their address. The query is now
// ignored entirely: identity comes from the verified token's immutable subject
// via the shared resolver (AUTH-001).
//
// { exists: false } is a legitimate answer — an authenticated user who has not
// completed signup yet — and the signup flow depends on it. A caller who cannot
// be identified at all is a refusal, not an absence, and says so.
const checkEmail = async (req, res) => {
	try {
		const { player, reason } = await resolvePlayer(req);

		if (player) {
			return res.json({
				exists: true,
				player_id: player.player_id,
				is_admin: player.is_admin,
				is_superadmin: player.is_superadmin,
			});
		}

		if (reason === UNRESOLVED.NO_ACCOUNT) {
			return res.json({ exists: false });
		}
		if (reason === UNRESOLVED.UNVERIFIED_EMAIL) {
			return res.status(403).json({ error: "Email address is not verified." });
		}
		if (reason === UNRESOLVED.AMBIGUOUS_EMAIL) {
			return res
				.status(403)
				.json({ error: "Account could not be identified uniquely." });
		}
		return res
			.status(403)
			.json({ error: "Could not verify identity from token." });
	} catch (error) {
		console.error("Error checking user in DB:", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

const getPlayerMatches = async (req, res) => {
	const { player_id } = req.params;
	try {
		const result = await pool.query(queries.getPlayerMatches, [player_id]);
		res.status(200).json(result.rows);
	} catch (error) {
		console.error("Error fetching player matches:", error);
		res.status(500).json({ error: "Failed to fetch player matches." });
	}
};

const getCareerStats = async (req, res) => {
	const { player_id } = req.params;
	try {
		const result = await pool.query(queries.getCareerStats, [player_id]);
		res.status(200).json(result.rows[0]);
	} catch (error) {
		console.error("Error fetching career stats:", error);
		res.status(500).json({ error: "Failed to fetch career stats." });
	}
};

module.exports = {
	getPlayers,
	addPlayer,
	getPlayer,
	getOwnPlayer,
	getPlayerStats,
	updatePlayer,
	getAccountBalance,
	getPayments,
	getNegativeBalance,
	auth0Signup,
	checkEmail,
	getMonthlyPlayerStats,
	getPlayerMatches,
	getCareerStats,
};
