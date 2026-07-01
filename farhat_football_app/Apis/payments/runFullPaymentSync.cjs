const axios = require("axios");
const pool = require("../../db.cjs");
require("dotenv").config();

// Monzo config
const MONZO_ACCESS_TOKEN = process.env.MONZO_ACCESS_TOKEN;
const ACCOUNT_ID = process.env.MONZO_ACCOUNT_ID;

const get24HoursAgoISO = () => {
	const date = new Date();
	date.setDate(date.getDate() - 1);
	return date.toISOString();
};

// 1️⃣ Fetch + store payments
const checkPayments = async () => {
	console.log("🔍 Fetching Monzo transactions...");

	const since = get24HoursAgoISO();

	const response = await axios.get("https://api.monzo.com/transactions", {
		params: {
			account_id: ACCOUNT_ID,
			since,
		},
		headers: {
			Authorization: `Bearer ${MONZO_ACCESS_TOKEN}`,
		},
	});

	const transactions = response.data.transactions;

	let insertedCount = 0;

	for (const tx of transactions) {
		if (tx.notes && tx.notes.toLowerCase().includes("ffc")) {
			const { id, created, amount, notes } = tx;

			const lowerNotes = notes.toLowerCase();
			const match = lowerNotes.match(/ffc(\d+)/);
			const playerId = match ? parseInt(match[1], 10) : null;

			// Insert only — the DB trigger credits the balance. ON CONFLICT
			// means anything the webhook already recorded is skipped (and so
			// does not fire the trigger), preventing double-credit.
			const result = await pool.query(
				`INSERT INTO payments (transaction_id, payment_date, amount, description, user_id, processed)
                 VALUES ($1, $2, $3, $4, $5, TRUE)
                 ON CONFLICT (transaction_id) DO NOTHING
                 RETURNING transaction_id;`,
				[id, created, Math.abs(amount) / 100, lowerNotes, playerId],
			);

			if (result.rowCount > 0) insertedCount++;

			console.log(`💰 ${id} → Player ${playerId} (£${Math.abs(amount) / 100})`);
		}
	}

	console.log(`✅ Payments inserted: ${insertedCount}`);

	return insertedCount;
};

// Poll Monzo for any payments the webhook missed. Balances are applied by
// the DB trigger on insert, so there is no separate balance-sync step.
const runFullPaymentSync = async () => {
	try {
		const inserted = await checkPayments();
		return { insertedPayments: inserted };
	} catch (error) {
		// Log only safe fields. The full axios error object contains the
		// request config, including the Monzo Bearer token — never log it.
		const status = error.response?.status;
		const detail = error.response?.data || error.message;
		console.error(`❌ Monzo poll failed (status ${status ?? "n/a"}):`, detail);
		throw new Error(
			`Monzo poll failed${status ? ` (status ${status})` : ""}`,
		);
	}
};

module.exports = {
	checkPayments,
	runFullPaymentSync,
};
