const { exec } = require("child_process");
const { runFullPaymentSync, syncPayments } = require("./runFullPaymentSync.cjs");
const pool = require("../../db.cjs");
const { recordPlayerLeave } = require("./leavinggame.cjs");

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

const runSyncOnly = async (req, res) => {
	try {
		const result = await syncPayments();
		res.json({
			message: `Sync complete. ${result.processedPayments} payment(s) applied to ${result.updatedPlayers} player(s).`,
			...result,
		});
	} catch (error) {
		console.error("Sync error:", error);
		res.status(500).json({ error: "Sync failed" });
	}
};

const issueRefund = async (req, res) => {
	const { admin_id, player_id, amount, description } = req.body;

	if (!player_id || !amount || Number(amount) <= 0) {
		return res.status(400).json({ error: "player_id and a positive amount are required" });
	}

	const adminCheck = await pool.query(
		"SELECT is_admin FROM players WHERE player_id = $1",
		[admin_id],
	);
	if (!adminCheck.rows[0]?.is_admin) {
		return res.status(403).json({ error: "Admin access required" });
	}

	try {
		await pool.query("BEGIN");

		const transactionId = `refund_${player_id}_${Date.now()}`;
		const desc = description || "Manual refund";

		await pool.query(
			`INSERT INTO payments (user_id, amount, payment_date, transaction_id, description, processed)
			 VALUES ($1, $2, NOW(), $3, $4, TRUE)`,
			[player_id, Number(amount), transactionId, desc],
		);

		await pool.query(
			`UPDATE players SET account_balance = account_balance + $1 WHERE player_id = $2`,
			[Number(amount), player_id],
		);

		await pool.query("COMMIT");
		res.json({ message: `Refund of £${Number(amount).toFixed(2)} issued successfully.` });
	} catch (error) {
		await pool.query("ROLLBACK");
		console.error("Refund error:", error);
		res.status(500).json({ error: "Failed to issue refund" });
	}
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

const leavingPayment = async (req, res) => {
	const { player_id } = req.params;
	const { matchData } = req.body;

	// Basic validation
	if (!matchData || !matchData.match_id || !matchData.price) {
		return res
			.status(400)
			.json({ error: "Missing required matchData (id and price)" });
	}

	try {
		const transactionId = await recordPlayerLeave(player_id, matchData);

		if (transactionId) {
			return res.status(201).json({
				success: true,
				message: "Leave processed and payment recorded.",
				transactionId: transactionId,
			});
		} else {
			return res.status(200).json({
				success: true,
				message: "Transaction was skipped (duplicate detected).",
			});
		}
	} catch (error) {
		return res.status(500).json({
			error: "Internal server error processing player exit.",
		});
	}
};

module.exports = {
	runCheckPaymentsScript,
	runSyncOnly,
	runPayments,
	paymentDashboard,
	leavingPayment,
	issueRefund,
};
