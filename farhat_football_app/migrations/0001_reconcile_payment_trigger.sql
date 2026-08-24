-- ============================================================================
-- Reconcile the payment -> balance trigger with the live definition (DB-002)
-- ----------------------------------------------------------------------------
-- Two definitions of apply_payment_to_balance() existed and they disagreed.
-- The live one, captured in the schema.sql baseline, updates the balance AND
-- writes an audit row to trigger_log. The standalone payment_balance_trigger.sql
-- at the repo root updated the balance only.
--
-- That file was written to be re-runnable, which made it the dangerous half:
-- CREATE OR REPLACE against production would have silently replaced the live
-- function with the version that writes no audit row. Balances would have kept
-- working, so nothing would have looked wrong, and the ledger would simply have
-- stopped recording what the trigger did. It has been deleted in favour of this
-- migration.
--
-- The live definition is canonical and is asserted here. On a freshly
-- provisioned database this restates what the baseline already created; on a
-- database where the standalone file was ever applied, it restores the audit
-- write.
--
-- Behaviour this preserves, and which tests/integration/payments/paymentTrigger.test.js pins:
--   * account_balance moves by the SIGNED amount, exactly once per inserted row
--     (positive = top-up or refund, negative = fee, leave penalty or charge)
--   * AFTER INSERT FOR EACH ROW, so an insert suppressed by
--     ON CONFLICT (transaction_id) DO NOTHING writes no row and does NOT fire —
--     this is why a retried Monzo webhook cannot double-credit
--   * rows_updated records how many player rows the update actually touched.
--     payments.user_id is nullable, so a payment attributed to nobody inserts,
--     moves no balance, and is caught by a trigger_log row with rows_updated = 0
--
-- Safe to re-run. Schema-qualified throughout, because the baseline ends by
-- setting search_path to empty.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.apply_payment_to_balance() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    rows_updated int;
BEGIN
    UPDATE public.players
    SET account_balance = COALESCE(account_balance, 0) + NEW.amount
    WHERE player_id = NEW.user_id;
    GET DIAGNOSTICS rows_updated = ROW_COUNT;

    INSERT INTO public.trigger_log(user_id, amount, transaction_id, rows_updated)
    VALUES (NEW.user_id, NEW.amount, NEW.transaction_id, rows_updated);

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_payment ON public.payments;

CREATE TRIGGER trg_apply_payment
AFTER INSERT ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.apply_payment_to_balance();
