const pool = require("../../db.cjs");
const matchQueries = require("./queries.cjs");
const matchPlayerQueries = require("../match_players/queries.cjs");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const SibApiV3Sdk = require("@getbrevo/brevo");

// Initialize Brevo API client
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
apiInstance.setApiKey(
	SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
	process.env.BREVO_API_KEY,
);

const getMatches = async (req, res) => {
	try {
		const { status, year, month, pitch_id, page = 1, limit = 10 } = req.query;

		const pageNum = parseInt(page);
		const limitNum = parseInt(limit);

		let baseQuery = `FROM matches WHERE 1=1`;
		const values = [];
		let index = 1;

		if (status) {
			baseQuery += ` AND match_status = $${index}`;
			values.push(status);
			index++;
		}

		if (year) {
			baseQuery += ` AND EXTRACT(YEAR FROM match_date) = $${index}`;
			values.push(year);
			index++;
		}

		if (month) {
			baseQuery += ` AND EXTRACT(MONTH FROM match_date) = $${index}`;
			values.push(month);
			index++;
		}

		if (pitch_id) {
			baseQuery += ` AND pitch_id = $${index}`;
			values.push(pitch_id);
			index++;
		}

		// 🔹 Get total count
		const countQuery = `SELECT COUNT(*) ${baseQuery}`;
		const countResult = await pool.query(countQuery, values);
		const total = parseInt(countResult.rows[0].count);

		// 🔹 Get paginated data
		const offset = (pageNum - 1) * limitNum;

		const dataQuery = `
      SELECT *
      ${baseQuery}
      ORDER BY match_date DESC
      LIMIT $${index} OFFSET $${index + 1}
    `;

		const result = await pool.query(dataQuery, [...values, limitNum, offset]);

		res.status(200).json({
			data: result.rows,
			total,
		});
	} catch (error) {
		console.error("Error fetching matches:", error);
		res.status(500).json({ error: "Error fetching matches" });
	}
};

const getMatchesByStatus = async (req, res) => {
	try {
		const { status } = req.params; // pending, completed etc
		const { year, month } = req.query; // optional filters

		let query = `
      SELECT *
      FROM matches
      WHERE match_status = $1
    `;

		const values = [status];
		let index = 2;

		if (year) {
			query += ` AND EXTRACT(YEAR FROM match_date) = $${index}`;
			values.push(year);
			index++;
		}

		if (month) {
			query += ` AND EXTRACT(MONTH FROM match_date) = $${index}`;
			values.push(month);
			index++;
		}

		query += ` ORDER BY match_date DESC`;

		const result = await pool.query(query, values);

		res.status(200).json(result.rows);
	} catch (error) {
		console.error("Error fetching matches:", error);
		res.status(500).json({ error: "Error fetching matches." });
	}
};

const getMatchById = (req, res) => {
	const match_id = parseInt(req.params.match_id);
	pool.query(matchQueries.getMatchById, [match_id], (error, results) => {
		if (error) throw error;
		res.status(200).json(results.rows);
	});
};

const createMatch = async (req, res) => {
	const {
		match_date,
		match_time,
		number_of_players,
		pitch_id,
		match_status,
		youtube_links,
	} = req.body;

	if (
		!match_date ||
		!match_time ||
		!number_of_players ||
		!pitch_id ||
		!match_status
	) {
		return res
			.status(400)
			.json({ error: "All fields except YouTube links are required." });
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
			youtube_links || null, // Optional field for YouTube links
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
		match_time,
		number_of_players,
		price,
		youtube_links,
		winning_team,
	} = req.body;

	try {
		// Fetch the current match status
		const currentStatusResult = await pool.query(
			matchQueries.getCurrentStatus,
			[match_id],
		);
		const currentStatus = currentStatusResult.rows[0].match_status;

		// Remove reserves and charge players if transitioning to in_progress
		if (currentStatus === "pending" && match_status === "in_progress") {
			// Remove players with team_id = 0
			await pool.query(matchQueries.removeReserves, [match_id]);

			// Get players in the match
			const playersResult = await pool.query(matchQueries.getPlayersInMatch, [
				match_id,
			]);
			const players = playersResult.rows;

			// Charge each player
			for (const player of players) {
				const amount = player.late
					? parseFloat(player.price) + 1
					: parseFloat(player.price);
				// Log the payment
				const description = `Match fee deduction for match ${match_id}`;
				await pool.query(matchQueries.logPayment, [
					player.player_id,
					-amount,
					description,
				]);
			}
		}

		// Update the match details
		const updatedMatch = await pool.query(matchQueries.updateMatch, [
			match_status,
			match_time,
			number_of_players,
			price,
			youtube_links,
			winning_team,
			match_id,
		]);

		res.status(200).json(updatedMatch.rows[0]);
	} catch (error) {
		console.error("Error updating match:", error);
		res
			.status(500)
			.json({ error: "An error occurred while updating the match." });
	}
};

// Get Man of the Match
const getManOfTheMatch = async (req, res) => {
	const { match_id } = req.params;

	try {
		const result = await pool.query(matchQueries.getManOfTheMatch, [match_id]);
		if (result.rows.length > 0) {
			res.json({ player_id: result.rows[0].man_of_the_match });
		} else {
			res.status(404).json({ error: "Match not found" });
		}
	} catch (error) {
		console.error("Error fetching man of the match:", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

// Update Man of the Match
const updateManOfTheMatch = async (req, res) => {
	const { match_id } = req.params;
	const { player_id } = req.body;

	try {
		await pool.query(matchQueries.updateManOfTheMatch, [player_id, match_id]);
		res.json({ message: "Man of the match updated successfully" });
	} catch (error) {
		console.error("Error updating man of the match:", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

const deleteMatch = async (req, res) => {
	const { match_id } = req.params;
	const { player_id } = req.body;

	if (player_id != 1) {
		return;
	}

	try {
		// Start a transaction to delete players and the match
		await pool.query("BEGIN");

		// Delete players in the match
		await pool.query(matchPlayerQueries.removeAllPlayerFromMatch, [match_id]);

		// Delete the match itself
		const result = await pool.query(matchQueries.deleteMatch, [match_id]);

		// Commit transaction
		await pool.query("COMMIT");

		if (result.rowCount > 0) {
			res.json({ message: "Match successfully deleted." });
		} else {
			res.status(404).json({ error: "Match not found." });
		}
	} catch (error) {
		// Rollback transaction on error
		await pool.query("ROLLBACK");
		console.error("Error deleting match:", error);
		res.status(500).json({ error: "Internal server error." });
	}
};

// try {
// 	// 1. Fetch player emails from database
// 	const result = await pool.query(matchQueries.getEmailsByMatch, [match_id]);

// 	// Map to Brevo's recipient format: [{ email: 'one@example.com' }, { email: 'two@example.com' }]
// 	const recipients = result.rows
// 		.filter((row) => row.email)
// 		.map((row) => ({ email: row.email }));

// 	if (recipients.length === 0) {
// 		return res
// 			.status(404)
// 			.json({ error: "No player emails found for this match." });
// 	}

// 	// 2. Construct the Brevo message
// 	const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

// 	sendSmtpEmail.subject = "Match Day! ⚽";
// 	sendSmtpEmail.htmlContent = `<html><body><strong>Reminder that you have joined tonight's game. Go to www.farhatfootball.co.uk/${match_id} to confirm details, teams may be subject to change</body></html>`;
// 	sendSmtpEmail.textContent = `Reminder that you have joined tonight's game. Go to www.farhatfootball.co.uk/${match_id} to confirm details, teams may be subject to change`;
// 	sendSmtpEmail.sender = {
// 		email: process.env.BREVO_FROM_EMAIL,
// 		name: "Match Notifier",
// 	};

// 	// By putting multiple recipients in the 'to' array, Brevo sends
// 	// individual emails to each (they won't see each other's addresses).
// 	sendSmtpEmail.to = recipients;

// 	// 3. Send via Brevo
// 	await apiInstance.sendTransacEmail(sendSmtpEmail);

// 	res
// 		.status(200)
// 		.json({ message: "Emails sent successfully to all players via Brevo." });
// } catch (error) {
// 	console.error("Brevo Error:", error.response?.body || error.message);
// 	res
// 		.status(500)
// 		.json({ error: "An error occurred while notifying players." });
// }
// email players
const notifyPlayers = async (req, res) => {
	const { match_id } = req.params;

	try {
		const result = await pool.query(matchQueries.getEmailsByMatch, [match_id]);

		const recipients = result.rows
			.filter((row) => row.email)
			.map((row) => ({ email: row.email }));

		if (recipients.length === 0) {
			return res
				.status(404)
				.json({ error: "No player emails found for this match." });
		}

		for (const { email } of recipients) {
			try {
				const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

				sendSmtpEmail.subject = "Match Day! ⚽";
				sendSmtpEmail.htmlContent = `
          <html>
            <body>
              <strong>
                Reminder that you have joined tonight's game.<br/>
                Go to www.farhatfootball.co.uk/matches/${match_id} to confirm details.
                Teams may be subject to change.
              </strong>
            </body>
          </html>
        `;

				sendSmtpEmail.textContent =
					`Reminder that you have joined tonight's game. ` +
					`Go to www.farhatfootball.co.uk/matches/${match_id} to confirm details. ` +
					`Teams may be subject to change.`;

				sendSmtpEmail.sender = {
					email: process.env.BREVO_FROM_EMAIL,
					name: "Match Notifier",
				};

				sendSmtpEmail.to = [{ email }];

				await apiInstance.sendTransacEmail(sendSmtpEmail);
			} catch (err) {
				console.error(`Failed to send to ${email}`, err);
				// optional: continue sending to others
			}
		}

		return res.json({ message: "Emails sent individually." });
	} catch (err) {
		console.error("Notify players failed:", err);
		return res.status(500).json({ error: "Failed to send notifications." });
	}
};

//email all players
const notifyAllPlayers = async (req, res) => {
	try {
		// Get players for the match
		const result = await pool.query(`SELECT email FROM players`);

		const recipients = result.rows
			.filter((row) => row.email)
			.map((row) => ({ email: row.email }));

		if (recipients.length === 0) {
			return res
				.status(404)
				.json({ error: "No player emails found for this match." });
		}

		await Promise.all(
			recipients.map(({ email }) => {
				const emailObj = new SibApiV3Sdk.SendSmtpEmail();

				emailObj.subject = "Thursday games return! ⚽";
				emailObj.htmlContent = `
          <html><body>
            <strong>
              Thursday night football is back.<br/>
              Go to www.farhatfootball.co.uk/matches to see what games we currently have available.
            </strong>
          </body></html>
        `;
				emailObj.textContent =
					`Thursday night football is back. ` +
					`Go to www.farhatfootball.co.uk/matches to see what games we currently have available.`;
				emailObj.sender = {
					email: process.env.BREVO_FROM_EMAIL,
					name: "Return of FFC Thursday",
				};

				emailObj.to = [{ email }];

				return apiInstance.sendTransacEmail(emailObj);
			}),
		);

		return res.json({ message: "Emails sent individually." });
	} catch (err) {
		console.error("Error sending notifications:", err);
		return res.status(500).json({ error: "Failed to send emails." });
	}
};

module.exports = {
	createMatch,
	getMatches,
	getMatchById,
	createMatch,
	updateMatch,
	getManOfTheMatch,
	updateManOfTheMatch,
	deleteMatch,
	notifyPlayers,
	notifyAllPlayers,
	getMatchesByStatus,
};
