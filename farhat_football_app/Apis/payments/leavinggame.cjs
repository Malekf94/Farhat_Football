/**
 * Records a player's exit payment in the database.
 * @param {string|number} playerId - The ID of the player.
 * @param {object} matchData - The match details containing id and price.
 * @returns {Promise<string|null>} The transaction ID if inserted, or null if ignored.
 *
 *
 */
const pool = require("../../db.cjs");

async function recordPlayerLeave(player_id, matchData) {
	const paymentDate = new Date();
	const amount = -matchData.price; // Negative amount for deduction

	// 1. Generate a unique ID using the timestamp to allow multiple leaves over time
	const timestamp = paymentDate.getTime();
	const transactionId = `match_exit_${matchData.match_id}_${player_id}_${timestamp}`;

	// 2. Format a user-friendly description
	const formattedDate = paymentDate.toLocaleString("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
	});
	const description = `You left at ${formattedDate}`;

	// Insert only — the DB trigger deducts the balance on insert.
	const queryText = `
        INSERT INTO payments (transaction_id, payment_date, amount, description, user_id, processed)
        VALUES ($1, $2, $3, $4, $5, TRUE)
        ON CONFLICT (transaction_id) DO NOTHING
        RETURNING transaction_id;
    `;

	try {
		// Assuming 'db' is your database connection pool
		const result = await pool.query(queryText, [
			transactionId,
			paymentDate,
			amount,
			description,
			player_id,
		]);

		return result.rows.length > 0 ? result.rows[0].transaction_id : null;
	} catch (error) {
		console.error(`Failed to record leave for player ${player_id}:`, error);
		throw error;
	}
}

module.exports = { recordPlayerLeave };
