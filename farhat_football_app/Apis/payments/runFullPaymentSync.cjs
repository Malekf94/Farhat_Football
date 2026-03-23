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

			const result = await pool.query(
				`INSERT INTO payments (transaction_id, payment_date, amount, description, user_id, processed)
                 VALUES ($1, $2, $3, $4, $5, FALSE)
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

// 2️⃣ Sync balances
const syncPayments = async () => {
	console.log("🔄 Syncing balances...");

	const updateResult = await pool.query(`
        UPDATE players p
        SET account_balance = COALESCE(p.account_balance, 0) + COALESCE(sub.total_paid, 0)
        FROM (
            SELECT user_id, SUM(amount) AS total_paid
            FROM payments
            WHERE processed = FALSE
            GROUP BY user_id
        ) AS sub
        WHERE p.player_id = sub.user_id
        RETURNING p.player_id;
    `);

	const processedResult = await pool.query(`
        UPDATE payments
        SET processed = TRUE
        WHERE processed = FALSE
        RETURNING payment_id;
    `);

	console.log("✅ Sync complete");

	return {
		updatedPlayers: updateResult.rowCount,
		processedPayments: processedResult.rowCount,
	};
};

// 3️⃣ Combined function
const runFullPaymentSync = async () => {
	try {
		const inserted = await checkPayments();
		const syncResult = await syncPayments();

		return {
			insertedPayments: inserted,
			...syncResult,
		};
	} catch (error) {
		console.error("❌ Full payment sync failed:", error);
		throw error;
	}
};

module.exports = {
	checkPayments,
	syncPayments,
	runFullPaymentSync,
};
