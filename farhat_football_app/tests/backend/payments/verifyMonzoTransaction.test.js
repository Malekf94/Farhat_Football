import { describe, it, expect } from "vitest";

// SEC-001 acceptance criteria, taken from the ticket:
//   - forged and altered events insert no payment
//   - wrong-account and unknown IDs insert no payment
//   - verified replay inserts at most once   (see the integration test)
//
// verifyTransaction is pure — no network, no database — so it is unit testable
// even though its module requires the pool. Nothing here runs a query.
const mod = await import("../../../Apis/payments/monzoWebhook.cjs");
const { verifyTransaction } = mod.default ?? mod;

const ACCOUNT = "acc_real";
const options = { accountId: ACCOUNT };

// A genuine inbound credit of £12.00 carrying player 7's reference.
const genuine = (overrides = {}) => ({
	id: "tx_genuine",
	account_id: ACCOUNT,
	amount: 1200,
	currency: "GBP",
	notes: "FFC7 subs",
	created: "2026-08-01T10:00:00Z",
	...overrides,
});

// What the webhook body claimed, which by default agrees with the bank.
const claimOf = (tx, overrides = {}) => ({
	id: tx.id,
	amount: tx.amount,
	notes: tx.notes,
	...overrides,
});

describe("verifyTransaction", () => {
	it("accepts a genuine credit and derives the payment from the bank's copy", () => {
		const tx = genuine();

		const verdict = verifyTransaction(tx, claimOf(tx), options);

		expect(verdict.ok).toBe(true);
		expect(verdict.payment).toEqual({
			transactionId: "tx_genuine",
			playerId: 7,
			amount: 12,
			notes: "ffc7 subs",
			created: "2026-08-01T10:00:00Z",
		});
	});

	it("refuses a transaction Monzo does not know", () => {
		const verdict = verifyTransaction(null, claimOf(genuine()), options);

		expect(verdict.ok).toBe(false);
		expect(verdict.reason).toBe("unknown_transaction");
	});

	it("refuses a credit on an account that is not ours", () => {
		const tx = genuine({ account_id: "acc_somebody_else" });

		const verdict = verifyTransaction(tx, claimOf(tx), options);

		expect(verdict.ok).toBe(false);
		expect(verdict.reason).toBe("wrong_account");
	});

	it("refuses to run at all when no account is configured", () => {
		const tx = genuine();

		const verdict = verifyTransaction(tx, claimOf(tx), { accountId: undefined });

		expect(verdict.ok).toBe(false);
		expect(verdict.reason).toBe("account_not_configured");
	});

	it("refuses when the notification names a different transaction", () => {
		const tx = genuine();

		const verdict = verifyTransaction(tx, claimOf(tx, { id: "tx_other" }), options);

		expect(verdict.ok).toBe(false);
		expect(verdict.reason).toBe("id_mismatch");
	});

	it("refuses an inflated amount even though the bank's figure is the real one", () => {
		const tx = genuine();

		const verdict = verifyTransaction(tx, claimOf(tx, { amount: 500000 }), options);

		expect(verdict.ok).toBe(false);
		expect(verdict.reason).toBe("amount_mismatch");
	});

	it("takes the amount from the bank, not from the notification", () => {
		const tx = genuine({ amount: 500 });

		const verdict = verifyTransaction(tx, claimOf(tx), options);

		expect(verdict.payment.amount).toBe(5);
	});

	it("still takes the amount from the bank when the notification omits it", () => {
		// A notification carrying no amount cannot be cross-checked, so nothing
		// rejects it earlier — this is where reading the figure from the wrong
		// side of the comparison actually shows up.
		const tx = genuine({ amount: 500 });

		const verdict = verifyTransaction(tx, { id: tx.id, notes: tx.notes }, options);

		expect(verdict.ok).toBe(true);
		expect(verdict.payment.amount).toBe(5);
	});

	it("takes the player reference from the bank, not from the notification", () => {
		const tx = genuine({ notes: "FFC7 subs" });

		const verdict = verifyTransaction(
			tx,
			claimOf(tx, { notes: "ffc999 subs" }),
			options,
		);

		expect(verdict.payment.playerId).toBe(7);
	});

	it("refuses a declined transaction", () => {
		const tx = genuine({ decline_reason: "INSUFFICIENT_FUNDS" });

		const verdict = verifyTransaction(tx, claimOf(tx), options);

		expect(verdict.ok).toBe(false);
		expect(verdict.reason).toBe("declined");
	});

	it("refuses a debit", () => {
		const tx = genuine({ amount: -1200 });

		const verdict = verifyTransaction(tx, claimOf(tx), options);

		expect(verdict.ok).toBe(false);
		expect(verdict.reason).toBe("not_a_credit");
	});

	it("refuses a zero amount", () => {
		const tx = genuine({ amount: 0 });

		const verdict = verifyTransaction(tx, claimOf(tx), options);

		expect(verdict.ok).toBe(false);
		expect(verdict.reason).toBe("not_a_credit");
	});

	it("refuses a currency that is not sterling", () => {
		const tx = genuine({ currency: "EUR" });

		const verdict = verifyTransaction(tx, claimOf(tx), options);

		expect(verdict.ok).toBe(false);
		expect(verdict.reason).toBe("wrong_currency");
	});

	it("refuses a credit carrying no player reference", () => {
		const tx = genuine({ notes: "birthday money" });

		const verdict = verifyTransaction(tx, claimOf(tx), options);

		expect(verdict.ok).toBe(false);
		expect(verdict.reason).toBe("no_player_reference");
	});

	it("refuses a notification with no transaction id", () => {
		const tx = genuine();

		const verdict = verifyTransaction(tx, { amount: tx.amount }, options);

		expect(verdict.ok).toBe(false);
		expect(verdict.reason).toBe("missing_transaction_id");
	});
});
