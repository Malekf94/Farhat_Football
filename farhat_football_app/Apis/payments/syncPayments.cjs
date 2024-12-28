const pool = require("../../../db.cjs");
require("dotenv").config();

const updateBalancesFromPayments = async () => {
	try {
		console.log("Syncing balances from unprocessed payments...");

		// Update player balances with unprocessed payments
		const updateQuery = `
            UPDATE players p
            SET account_balance = COALESCE(p.account_balance, 0) + COALESCE(sub.total_paid, 0)
            FROM (
                SELECT user_id, SUM(amount) AS total_paid
                FROM payments
                WHERE processed = FALSE
                GROUP BY user_id
            ) AS sub
            WHERE p.player_id = sub.user_id;
        `;

		await pool.query(updateQuery);

		// Mark processed payments as true
		const markProcessedQuery = `
            UPDATE payments
            SET processed = TRUE
            WHERE processed = FALSE;
        `;

		await pool.query(markProcessedQuery);

		console.log("Account balances updated and payments marked as processed.");
	} catch (error) {
		console.error("Error updating player balances:", error.message);
	} finally {
		pool.end();
	}
};

updateBalancesFromPayments();
