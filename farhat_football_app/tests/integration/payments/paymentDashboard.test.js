import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
	pool,
	resetDatabase,
	insertPlayer,
	insertPayment,
	makeResponse,
} from "../helpers/seed.js";

const mod = await import("../../../Apis/payments/controller.cjs");
const { paymentDashboard } = mod.default ?? mod;

// SEC-004: the dashboard response carries only the fields the report needs.
// transaction_id and user_id are deliberately absent — asserting the exact key
// set is what stops a later `SELECT p.*` reintroducing them unnoticed.
const EXPECTED_FIELDS = [
	"amount",
	"description",
	"payment_date",
	"payment_id",
	"player_name",
	"processed",
];

describe("paymentDashboard response contract", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	afterAll(async () => {
		await pool.end();
	});

	it("returns only the documented fields for each payment", async () => {
		const player = await insertPlayer({ first_name: "Ada", last_name: "Lovelace" });
		await insertPayment({
			user_id: player.player_id,
			amount: 12.5,
			transaction_id: "tx_contract_1",
		});
		const res = makeResponse();

		await paymentDashboard({}, res);

		expect(res.body.payments).toHaveLength(1);
		expect(Object.keys(res.body.payments[0]).sort()).toEqual(EXPECTED_FIELDS);
	});

	it("does not expose the transaction id or the player foreign key", async () => {
		const player = await insertPlayer();
		await insertPayment({
			user_id: player.player_id,
			amount: 5,
			transaction_id: "tx_contract_secret",
		});
		const res = makeResponse();

		await paymentDashboard({}, res);

		const row = res.body.payments[0];
		expect(row).not.toHaveProperty("transaction_id");
		expect(row).not.toHaveProperty("user_id");
		expect(JSON.stringify(res.body)).not.toContain("tx_contract_secret");
	});

	it("joins the player's full name onto each row", async () => {
		const player = await insertPlayer({ first_name: "Ada", last_name: "Lovelace" });
		await insertPayment({
			user_id: player.player_id,
			amount: 5,
			transaction_id: "tx_contract_2",
		});
		const res = makeResponse();

		await paymentDashboard({}, res);

		expect(res.body.payments[0].player_name).toBe("Ada Lovelace");
	});

	it("orders payments newest first", async () => {
		const player = await insertPlayer();
		await insertPayment({
			user_id: player.player_id,
			amount: 5,
			transaction_id: "tx_older",
			description: "older",
			payment_date: new Date("2026-01-01T09:00:00Z"),
		});
		await insertPayment({
			user_id: player.player_id,
			amount: 7,
			transaction_id: "tx_newer",
			description: "newer",
			payment_date: new Date("2026-02-01T09:00:00Z"),
		});
		const res = makeResponse();

		await paymentDashboard({}, res);

		expect(res.body.payments.map((p) => p.description)).toEqual(["newer", "older"]);
	});

	it("summarises totals, unprocessed value and the count of players owing", async () => {
		const owing = await insertPlayer();
		const settled = await insertPlayer();
		await insertPayment({
			user_id: owing.player_id,
			amount: -10,
			transaction_id: "tx_charge",
		});
		await insertPayment({
			user_id: settled.player_id,
			amount: 25,
			transaction_id: "tx_credit",
			processed: false,
		});
		const res = makeResponse();

		await paymentDashboard({}, res);

		// pg returns numeric columns as strings, so these are compared as given
		// rather than coerced — the dashboard formats them client-side.
		expect(res.body.summary.totalReceived).toBe("15.00");
		expect(res.body.summary.unprocessed).toBe("25.00");
		expect(res.body.summary.playersOwing).toBe("1");
	});
});
