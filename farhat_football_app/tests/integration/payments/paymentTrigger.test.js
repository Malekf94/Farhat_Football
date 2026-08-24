import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { pool, resetDatabase, insertPlayer, insertPayment } from "../helpers/seed.js";

// DB-002. Two definitions of apply_payment_to_balance() disagreed: the live one
// (now the schema.sql baseline, re-asserted by migrations/0001) writes an audit
// row to trigger_log, while the standalone payment_balance_trigger.sql wrote
// only the balance. Re-running that file against production would have removed
// the audit write with no visible symptom — balances would have kept working.
//
// These pin both halves, so a future edit that drops the trigger_log insert
// fails here instead of going unnoticed.

const balanceOf = async (playerId) => {
	const { rows } = await pool.query(
		"SELECT account_balance FROM players WHERE player_id = $1",
		[playerId],
	);
	// pg returns numeric as a string; compare as a number deliberately.
	return Number(rows[0].account_balance);
};

const auditRowsFor = async (transactionId) => {
	const { rows } = await pool.query(
		"SELECT user_id, amount, transaction_id, rows_updated FROM trigger_log WHERE transaction_id = $1",
		[transactionId],
	);
	return rows;
};

describe("trg_apply_payment", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	afterAll(async () => {
		await pool.end();
	});

	it("moves the balance by the signed amount and records one audit row", async () => {
		const player = await insertPlayer({ account_balance: 10 });

		await insertPayment({
			user_id: player.player_id,
			amount: 25.5,
			transaction_id: "tx-topup-1",
		});

		expect(await balanceOf(player.player_id)).toBe(35.5);

		const audit = await auditRowsFor("tx-topup-1");
		expect(audit).toHaveLength(1);
		expect(audit[0].user_id).toBe(player.player_id);
		expect(Number(audit[0].amount)).toBe(25.5);
		expect(audit[0].rows_updated).toBe(1);
	});

	it("subtracts for a negative amount, so a charge is the same path as a top-up", async () => {
		const player = await insertPlayer({ account_balance: 10 });

		await insertPayment({
			user_id: player.player_id,
			amount: -6.25,
			transaction_id: "tx-charge-1",
		});

		expect(await balanceOf(player.player_id)).toBe(3.75);
		expect((await auditRowsFor("tx-charge-1"))[0].rows_updated).toBe(1);
	});

	it("applies exactly once across several payments rather than compounding", async () => {
		const player = await insertPlayer({ account_balance: 0 });

		await insertPayment({ user_id: player.player_id, amount: 10, transaction_id: "tx-a" });
		await insertPayment({ user_id: player.player_id, amount: 5, transaction_id: "tx-b" });
		await insertPayment({ user_id: player.player_id, amount: -3, transaction_id: "tx-c" });

		expect(await balanceOf(player.player_id)).toBe(12);

		const { rows } = await pool.query("SELECT count(*)::int AS n FROM trigger_log");
		expect(rows[0].n).toBe(3);
	});

	it("does not fire when a duplicate transaction_id is suppressed by ON CONFLICT", async () => {
		const player = await insertPlayer({ account_balance: 0 });

		const first = await insertPayment({
			user_id: player.player_id,
			amount: 20,
			transaction_id: "tx-replay",
		});
		const second = await insertPayment({
			user_id: player.player_id,
			amount: 20,
			transaction_id: "tx-replay",
		});

		// The suppressed insert writes no row, so the AFTER INSERT trigger never
		// runs — this is what stops a retried Monzo webhook double-crediting.
		expect(first).not.toBeNull();
		expect(second).toBeNull();
		expect(await balanceOf(player.player_id)).toBe(20);
		expect(await auditRowsFor("tx-replay")).toHaveLength(1);
	});

	it("records rows_updated = 0 when a payment is attributed to nobody", async () => {
		// payments.user_id is nullable, so money can land with no player attached.
		// The balance update matches nothing and the audit row is the only trace.
		await insertPayment({
			user_id: null,
			amount: 40,
			transaction_id: "tx-orphan",
		});

		const audit = await auditRowsFor("tx-orphan");
		expect(audit).toHaveLength(1);
		expect(audit[0].user_id).toBeNull();
		expect(audit[0].rows_updated).toBe(0);
	});

	it("treats a null starting balance as zero rather than propagating null", async () => {
		const player = await insertPlayer({ account_balance: 0 });
		await pool.query("UPDATE players SET account_balance = NULL WHERE player_id = $1", [
			player.player_id,
		]);

		await insertPayment({
			user_id: player.player_id,
			amount: 15,
			transaction_id: "tx-from-null",
		});

		expect(await balanceOf(player.player_id)).toBe(15);
	});
});
