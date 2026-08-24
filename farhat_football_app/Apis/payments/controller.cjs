const { exec } = require("child_process");
const { runFullPaymentSync } = require("./runFullPaymentSync.cjs");
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

// Polls Monzo for any payments the webhook missed; the DB trigger applies
// balances on insert. (Balances are no longer "synced" from a flag.)
const runSyncOnly = async (req, res) => {
	try {
		const result = await runFullPaymentSync();
		res.json({
			message: `Checked Monzo. ${result.insertedPayments} new payment(s) recorded.`,
			...result,
		});
	} catch (error) {
		console.error("Monzo poll error:", error);
		res.status(500).json({ error: "Monzo check failed" });
	}
};

const issueRefund = async (req, res) => {
	// Admin identity is verified by requireAdmin middleware (req.player),
	// not trusted from the request body.
	const { player_id, amount, description } = req.body;

	if (!player_id || !amount || Number(amount) <= 0) {
		return res.status(400).json({ error: "player_id and a positive amount are required" });
	}

	try {
		const transactionId = `refund_${player_id}_${Date.now()}`;
		const desc = description || "Manual refund";

		// Insert only — the DB trigger credits the player's balance.
		await pool.query(
			`INSERT INTO payments (user_id, amount, payment_date, transaction_id, description, processed)
			 VALUES ($1, $2, NOW(), $3, $4, TRUE)`,
			[player_id, Number(amount), transactionId, desc],
		);

		res.json({ message: `Refund of £${Number(amount).toFixed(2)} issued successfully.` });
	} catch (error) {
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
			SELECT p.payment_id,
			       p.amount,
			       p.payment_date,
			       p.description,
			       p.processed,
			       pl.first_name || ' ' || pl.last_name AS player_name
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

// A player who pulls out close to kick-off still owes the fee. The cutoff and
// the amount are decided here from the match row — never from the request —
// because both used to arrive in the request body.
const LEAVE_CHARGE_CUTOFF_HOURS = 5;

const leavingPayment = async (req, res) => {
	const match_id = Number.parseInt(req.body?.match_id, 10);
	// Validated against the token by requireSelfOrHostAdmin.
	const player_id = req.targetPlayerId;

	if (!Number.isInteger(match_id)) {
		return res.status(400).json({ error: "match_id is required." });
	}

	const client = await pool.connect();
	try {
		await client.query("BEGIN");

		// Lock the match so its price and timing cannot move underneath the
		// decision, and so two concurrent leaves cannot interleave.
		const matchResult = await client.query(
			`SELECT match_status,
			        price,
			        (match_date + match_time) AS kickoff,
			        (match_date + match_time) - now() <= $2::interval AS within_cutoff
			 FROM matches
			 WHERE match_id = $1
			 FOR UPDATE`,
			[match_id, `${LEAVE_CHARGE_CUTOFF_HOURS} hours`],
		);

		if (matchResult.rows.length === 0) {
			await client.query("ROLLBACK");
			return res.status(404).json({ error: "Match not found." });
		}

		const match = matchResult.rows[0];
		if (["completed", "friendly"].includes(match.match_status)) {
			await client.query("ROLLBACK");
			return res
				.status(400)
				.json({ error: "This match has already been finalised." });
		}

		// Removing the roster row and charging for it are the same decision, so
		// they happen together. A player who is not on the roster cannot leave it.
		const removal = await client.query(
			"DELETE FROM match_players WHERE match_id = $1 AND player_id = $2 RETURNING player_id",
			[match_id, player_id],
		);
		if (removal.rowCount === 0) {
			await client.query("ROLLBACK");
			return res.status(404).json({ error: "Player not found in this match." });
		}

		let transactionId = null;
		if (match.within_cutoff) {
			transactionId = await recordPlayerLeave(client, {
				player_id,
				match_id,
				amount: Number(match.price),
			});
		}

		await client.query("COMMIT");

		return res.status(200).json({
			success: true,
			charged: Boolean(transactionId),
			amount: transactionId ? Number(match.price) : 0,
			transactionId,
			message: transactionId
				? `You left this match within ${LEAVE_CHARGE_CUTOFF_HOURS} hours of kick-off, so the fee was charged.`
				: "You have left the match.",
		});
	} catch (error) {
		try {
			await client.query("ROLLBACK");
		} catch (rollbackError) {
			console.error("Rollback failed after leave error:", rollbackError);
		}
		console.error("Error processing player exit:", error);
		return res.status(500).json({
			error: "Internal server error processing player exit.",
		});
	} finally {
		client.release();
	}
};

// Lists every player whose account_balance disagrees with the sum of their
// payment rows. Since every balance change now flows through a payment,
// balance should equal SUM(payments); any drift is worth investigating.
const balanceAudit = async (req, res) => {
	try {
		const result = await pool.query(`
			SELECT p.player_id,
			       p.preferred_name,
			       p.account_balance AS current_balance,
			       COALESCE(pay.total, 0) AS expected_balance,
			       p.account_balance - COALESCE(pay.total, 0) AS drift
			FROM players p
			LEFT JOIN (
				SELECT user_id, SUM(amount) AS total
				FROM payments
				GROUP BY user_id
			) pay ON pay.user_id = p.player_id
			WHERE p.account_balance <> COALESCE(pay.total, 0)
			ORDER BY ABS(p.account_balance - COALESCE(pay.total, 0)) DESC
		`);
		res.json({ rows: result.rows });
	} catch (err) {
		console.error("Balance audit error:", err);
		res.status(500).json({ error: "Failed to run balance audit" });
	}
};

// Sets one player's balance to the sum of their payment rows. This is a
// correction, not a transaction, so it does not create a payment row (and
// therefore does not fire the balance trigger).
const reconcilePlayer = async (req, res) => {
	const { player_id } = req.params;
	try {
		const result = await pool.query(
			`UPDATE players
			 SET account_balance = COALESCE(
			     (SELECT SUM(amount) FROM payments WHERE user_id = $1), 0)
			 WHERE player_id = $1
			 RETURNING account_balance`,
			[player_id],
		);
		if (result.rowCount === 0) {
			return res.status(404).json({ error: "Player not found" });
		}
		res.json({
			message: "Balance reconciled.",
			new_balance: result.rows[0].account_balance,
		});
	} catch (err) {
		console.error("Reconcile error:", err);
		res.status(500).json({ error: "Failed to reconcile balance" });
	}
};

module.exports = {
	runCheckPaymentsScript,
	runSyncOnly,
	runPayments,
	paymentDashboard,
	leavingPayment,
	issueRefund,
	balanceAudit,
	reconcilePlayer,
};
