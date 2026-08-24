/**
 * Records a player's exit charge for a match.
 *
 * Runs on a caller-supplied client so the charge commits or rolls back with
 * the roster removal that goes with it — never on its own.
 *
 * The transaction id is derived from the match and the player alone. It used
 * to carry a timestamp, which made every call a new row: a repeated request
 * charged the player again each time. Deterministic means ON CONFLICT can do
 * its job, so a retry writes nothing and the balance trigger does not fire.
 *
 * @param {import("pg").PoolClient} client - client already inside a transaction
 * @param {object} params
 * @param {number} params.player_id - the player leaving
 * @param {number} params.match_id - the match being left
 * @param {number} params.amount - the charge, as a positive number
 * @returns {Promise<string|null>} the transaction id, or null if already charged
 */
async function recordPlayerLeave(client, { player_id, match_id, amount }) {
	const transactionId = `match_exit_${match_id}_${player_id}`;
	const description = `Left match ${match_id}`;

	// Insert only — the DB trigger deducts the balance on insert.
	const result = await client.query(
		`INSERT INTO payments (transaction_id, payment_date, amount, description, user_id, processed)
		 VALUES ($1, NOW(), $2, $3, $4, TRUE)
		 ON CONFLICT (transaction_id) DO NOTHING
		 RETURNING transaction_id;`,
		[transactionId, -Math.abs(amount), description, player_id],
	);

	return result.rows[0]?.transaction_id ?? null;
}

module.exports = { recordPlayerLeave };
