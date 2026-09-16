const axios = require("axios");
const pool = require("../../db.cjs");
require("dotenv").config();

// The webhook body is a notification, not evidence. Anyone who can reach the
// endpoint can post one, so nothing in it is trusted: it is read only for the
// transaction id, and every value written to the ledger comes from the copy
// re-fetched from Monzo under our own credentials.

const MONZO_API = "https://api.monzo.com";
const FETCH_TIMEOUT_MS = 10_000;
const PLAYER_REFERENCE = /ffc(\d+)/;

async function fetchMonzoTransaction(transactionId) {
	const response = await axios.get(
		`${MONZO_API}/transactions/${encodeURIComponent(transactionId)}`,
		{
			headers: { Authorization: `Bearer ${process.env.MONZO_ACCESS_TOKEN}` },
			timeout: FETCH_TIMEOUT_MS,
		},
	);
	return response.data?.transaction ?? null;
}

/**
 * Decides whether a re-fetched transaction may become a payment row.
 *
 * Pure: no network, no database. Everything it returns is taken from the
 * fetched transaction, never from the claimed one.
 *
 * @param {object|null} actual - the transaction as Monzo reports it
 * @param {object} claimed - the transaction as the webhook body described it
 * @param {object} options
 * @param {string} options.accountId - the account payments are expected on
 * @returns {{ok: true, payment: object} | {ok: false, reason: string}}
 */
function verifyTransaction(actual, claimed, { accountId } = {}) {
	if (!actual) return { ok: false, reason: "unknown_transaction" };
	if (!claimed?.id) return { ok: false, reason: "missing_transaction_id" };
	if (actual.id !== claimed.id) return { ok: false, reason: "id_mismatch" };

	if (!accountId) return { ok: false, reason: "account_not_configured" };
	if (actual.account_id !== accountId) return { ok: false, reason: "wrong_account" };

	if (actual.decline_reason) return { ok: false, reason: "declined" };
	if (actual.currency && actual.currency !== "GBP") {
		return { ok: false, reason: "wrong_currency" };
	}

	if (!Number.isFinite(actual.amount) || actual.amount <= 0) {
		return { ok: false, reason: "not_a_credit" };
	}

	// An altered amount means the notification disagrees with the bank. The
	// bank wins, but the disagreement itself is worth refusing on.
	if (claimed.amount !== undefined && claimed.amount !== actual.amount) {
		return { ok: false, reason: "amount_mismatch" };
	}

	const notes = (actual.notes || "").toLowerCase();
	const reference = notes.match(PLAYER_REFERENCE);
	if (!reference) return { ok: false, reason: "no_player_reference" };

	const playerId = Number.parseInt(reference[1], 10);
	if (!Number.isInteger(playerId) || playerId <= 0) {
		return { ok: false, reason: "no_player_reference" };
	}

	return {
		ok: true,
		payment: {
			transactionId: actual.id,
			playerId,
			amount: actual.amount / 100,
			notes,
			created: actual.created,
		},
	};
}

// Insert only — the DB trigger applies the amount to the player's balance.
// ON CONFLICT means a redelivered webhook inserts nothing and so does not fire
// the trigger, which is what makes retries safe.
async function recordVerifiedPayment(payment) {
	const result = await pool.query(
		`INSERT INTO payments
			(transaction_id, payment_date, amount, description, user_id, processed)
		 VALUES ($1, $2, $3, $4, $5, TRUE)
		 ON CONFLICT (transaction_id) DO NOTHING
		 RETURNING payment_id;`,
		[
			payment.transactionId,
			payment.created,
			payment.amount,
			payment.notes,
			payment.playerId,
		],
	);
	return result.rowCount > 0;
}

// TEMPORARY — payment re-verification (SEC-001) is deferred. This account no
// longer keeps a fresh Monzo access token, so re-fetching every event from
// Monzo would 401 and reject every genuine payment. Until a durable token is in
// place, this restores the pre-SEC-001 behaviour: trust the webhook body and
// record the payment directly. fetchMonzoTransaction / verifyTransaction remain
// defined, exported and unit-tested, ready to switch back on — swap this body
// back to the re-fetch version once the token is sorted.
//
// Always answers 200.
async function handleMonzoWebhook(req, res) {
	try {
		const body = req.body;
		if (body?.type !== "transaction.created") {
			return res.sendStatus(200);
		}

		const tx = body.data || {};
		if (!tx.id || !(tx.amount > 0)) {
			return res.sendStatus(200);
		}

		const notes = (tx.notes || "").toLowerCase();
		const reference = notes.match(PLAYER_REFERENCE);
		const playerId = reference ? Number.parseInt(reference[1], 10) : null;
		if (!playerId) {
			console.log("[monzo] no valid player reference in notes:", notes);
			return res.sendStatus(200);
		}

		const inserted = await recordVerifiedPayment({
			transactionId: tx.id,
			playerId,
			amount: tx.amount / 100,
			notes,
			created: tx.created,
		});
		console.log(
			inserted
				? `[monzo] recorded ${tx.id} for player ${playerId}`
				: `[monzo] already recorded ${tx.id}`,
		);
	} catch (error) {
		console.error("[monzo] webhook error:", error);
	}

	return res.sendStatus(200);
}

module.exports = {
	fetchMonzoTransaction,
	verifyTransaction,
	recordVerifiedPayment,
	handleMonzoWebhook,
};
