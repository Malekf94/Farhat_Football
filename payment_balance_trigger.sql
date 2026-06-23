-- ============================================================================
-- Payment → balance trigger
-- ----------------------------------------------------------------------------
-- Makes inserting a row into `payments` the SINGLE source of truth for
-- account_balance. Whenever a payment row is inserted, the player's balance
-- is adjusted by the (signed) amount automatically:
--   positive amount  -> top-up / refund  (balance goes up)
--   negative amount  -> match fee / leave penalty / manual charge (balance down)
--
-- This removes the need for any application code to update account_balance,
-- and eliminates the "payment logged but balance not updated" class of bug.
--
-- Idempotency note: this is an AFTER INSERT ... FOR EACH ROW trigger, so it
-- only fires for rows that were actually inserted. Inserts that hit
-- ON CONFLICT (transaction_id) DO NOTHING insert no row and do NOT fire the
-- trigger, so duplicate webhook deliveries never double-credit.
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_payment_to_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE players
    SET account_balance = COALESCE(account_balance, 0) + NEW.amount
    WHERE player_id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_apply_payment ON payments;

CREATE TRIGGER trg_apply_payment
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION apply_payment_to_balance();
