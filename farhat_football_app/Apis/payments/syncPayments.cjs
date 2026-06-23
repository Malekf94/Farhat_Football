// ⚠️ DEPRECATED — DO NOT RUN.
// Balances are now applied automatically by the `trg_apply_payment` database
// trigger the moment a payment row is inserted (see payment_balance_trigger.sql).
// Running the old balance-sync below would DOUBLE every unprocessed payment,
// so it has been disabled.
console.log(
	"syncPayments.cjs is deprecated. Balances are applied by the DB trigger on insert; no sync needed.",
);
