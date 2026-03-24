const { exec } = require("child_process");
const { runFullPaymentSync } = require("./runFullPaymentSync.cjs");
const { pool } = require("../../db.cjs");

// Run Check Payments Script
const runCheckPaymentsScript = (req, res) => {
	exec("node Apis/payments/checkPayments.cjs", (error, stdout, stderr) => {
		if (error) {
			console.error(`Error running checkPayments script: ${stderr}`);
			return res.status(500).json({ error: "Failed to check payments" });
		}
		console.log(`CheckPayments Output: ${stdout}`);
		res.json({ message: "Payments checked successfully" });
	});
};

// Run Sync Payments Script
const runSyncPaymentsScript = (req, res) => {
	exec("node Apis/payments/syncPayments.cjs", (error, stdout, stderr) => {
		if (error) {
			console.error(`Error running syncPayments script: ${stderr}`);
			return res.status(500).json({ error: "Failed to sync balances" });
		}
		console.log(`SyncPayments Output: ${stdout}`);
		res.json({ message: "Player balances updated successfully" });
	});
};

const runPayments = async (req, res) => {
	try {
		const result = await runFullPaymentSync();

		res.json({
			message: "Payments checked and synced successfully",
			...result,
		});
	} catch (error) {
		console.error("Controller error:", error);
		res.status(500).json({ error: "Payment process failed" });
	}
};

const paymentDashboard = async (req, res) => {
	try {
		const payments = await pool.query(`
			SELECT p.*, pl.first_name || ' ' || pl.last_name AS player_name
			FROM payments p
			LEFT JOIN players pl ON pl.player_id = p.user_id
			ORDER BY payment_date DESC
		`);

		const summary = await pool.query(`
			SELECT 
				SUM(amount) AS total_received,
				SUM(CASE WHEN processed = FALSE THEN amount ELSE 0 END) AS unprocessed
			FROM payments
		`);

		const owing = await pool.query(`
			SELECT COUNT(*) FROM players WHERE account_balance < 0
		`);

		res.json({
			payments: payments.rows,
			summary: {
				totalReceived: summary.rows[0].total_received || 0,
				unprocessed: summary.rows[0].unprocessed || 0,
				playersOwing: owing.rows[0].count,
			},
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Failed to fetch payments" });
	}
};

module.exports = {
	runCheckPaymentsScript,
	runSyncPaymentsScript,
	runPayments,
	paymentDashboard,
};
