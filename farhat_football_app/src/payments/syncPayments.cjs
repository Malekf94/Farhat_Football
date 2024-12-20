const pool = require("../../db.cjs");
require("dotenv").config();

const updateBalancesFromPayments = async () => {
	try {
		console.log("Syncing balances from payments...");

		const query = `
      UPDATE players p
      SET account_balance = COALESCE(p.account_balance, 0) + COALESCE(sub.total_paid, 0)
      FROM (
        SELECT user_id, SUM(amount) AS total_paid
        FROM payments
        GROUP BY user_id
      ) AS sub
      WHERE p.player_id = sub.user_id;
    `;

		await pool.query(query);
		console.log("Account balances updated successfully.");
	} catch (error) {
		console.error("Error updating player balances:", error.message);
	} finally {
		pool.end();
	}
};

updateBalancesFromPayments();
