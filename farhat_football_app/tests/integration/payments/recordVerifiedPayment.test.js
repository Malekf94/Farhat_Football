import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { pool, resetDatabase, insertPlayer } from "../helpers/seed.js";

const mod = await import("../../../Apis/payments/monzoWebhook.cjs");
const { recordVerifiedPayment } = mod.default ?? mod;

// SEC-001: "verified replay inserts at most once". The suppression is the
// ON CONFLICT clause, and it matters because a suppressed insert does not fire
// the balance trigger — that is the whole reason a redelivered webhook cannot
// credit an account twice.

const balanceOf = async (player_id) => {
	const { rows } = await pool.query(
		"SELECT account_balance FROM players WHERE player_id = $1",
		[player_id],
	);
	return rows[0].account_balance;
};

const paymentsFor = async (player_id) => {
	const { rows } = await pool.query(
		"SELECT amount, transaction_id, description FROM payments WHERE user_id = $1",
		[player_id],
	);
	return rows;
};

const verifiedPayment = (playerId, overrides = {}) => ({
	transactionId: "tx_verified",
	playerId,
	amount: 12,
	notes: "ffc7 subs",
	created: "2026-08-01T10:00:00Z",
	...overrides,
});

describe("recordVerifiedPayment", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	afterAll(async () => {
		await pool.end();
	});

	it("records the credit and lets the trigger move the balance", async () => {
		const player = await insertPlayer();

		const inserted = await recordVerifiedPayment(verifiedPayment(player.player_id));

		expect(inserted).toBe(true);
		expect(await balanceOf(player.player_id)).toBe("12.00");
		expect(await paymentsFor(player.player_id)).toHaveLength(1);
	});

	it("credits once however many times the same transaction is delivered", async () => {
		const player = await insertPlayer();
		const payment = verifiedPayment(player.player_id);

		const first = await recordVerifiedPayment(payment);
		const second = await recordVerifiedPayment(payment);
		const third = await recordVerifiedPayment(payment);

		expect([first, second, third]).toEqual([true, false, false]);
		expect(await paymentsFor(player.player_id)).toHaveLength(1);
		expect(await balanceOf(player.player_id)).toBe("12.00");
	});

	it("does not let a redelivery smuggle in a different amount", async () => {
		const player = await insertPlayer();
		await recordVerifiedPayment(verifiedPayment(player.player_id, { amount: 12 }));

		const inserted = await recordVerifiedPayment(
			verifiedPayment(player.player_id, { amount: 5000 }),
		);

		expect(inserted).toBe(false);
		expect(await balanceOf(player.player_id)).toBe("12.00");
	});

	it("keeps distinct transactions separate", async () => {
		const player = await insertPlayer();

		await recordVerifiedPayment(verifiedPayment(player.player_id, { transactionId: "tx_a" }));
		await recordVerifiedPayment(
			verifiedPayment(player.player_id, { transactionId: "tx_b", amount: 3 }),
		);

		expect(await paymentsFor(player.player_id)).toHaveLength(2);
		expect(await balanceOf(player.player_id)).toBe("15.00");
	});
});
