-- ============================================================================
-- Adopt the Auth0 subject as application identity (AUTH-001)
-- ----------------------------------------------------------------------------
-- Every authorization decision resolved the caller by EMAIL: each guard read
-- the email claim from the verified token and looked up
-- `players WHERE email = $1`. Email is mutable and re-assignable, so a change
-- of address in Auth0 silently moved — or lost — a player's privileges, and two
-- rows differing only in case were two different identities to PostgreSQL while
-- being the same mailbox in practice.
--
-- The Auth0 `sub` claim is immutable for the life of the account and is present
-- on every access token. This column is where it gets recorded, so that a
-- request resolves to exactly one player independently of what the email says.
--
-- The column is nullable because existing rows have no subject yet. They are
-- claimed on first authenticated request: the resolver in Apis/auth/identity.cjs
-- matches the token's email to exactly one unclaimed row and binds the subject
-- to it, once. A row that already carries a subject is never re-bound, which is
-- what stops a second account from taking over the first.
--
-- The unique index is PARTIAL. A plain UNIQUE constraint would also work, since
-- PostgreSQL treats NULLs as distinct, but stating WHERE auth0_sub IS NOT NULL
-- makes the intent explicit and keeps the index to the claimed rows only.
--
-- ROLLBACK
-- --------
-- This migration is purely additive: it creates a column and an index and
-- rewrites no existing data, so reverting it cannot lose anything that was
-- there before. Application code tolerates auth0_sub being NULL on every row —
-- that is the unclaimed state it starts in — so the code can be rolled back on
-- its own and left running against this schema, which is the preferred order.
--
-- To undo the schema as well, after the code is rolled back:
--
--   DROP INDEX IF EXISTS public.players_auth0_sub_key;
--   ALTER TABLE public.players DROP COLUMN IF EXISTS auth0_sub;
--   DELETE FROM public.schema_migrations WHERE version = '0002';
--
-- Dropping the column discards the subject bindings collected so far; they are
-- rebuilt automatically on the next authenticated request from each player, so
-- the cost is one extra claim per account, not a loss of identity.
-- ============================================================================

ALTER TABLE public.players
	ADD COLUMN IF NOT EXISTS auth0_sub text;

CREATE UNIQUE INDEX IF NOT EXISTS players_auth0_sub_key
	ON public.players (auth0_sub)
	WHERE auth0_sub IS NOT NULL;

COMMENT ON COLUMN public.players.auth0_sub IS
	'Immutable Auth0 subject (the `sub` claim). NULL until the account is claimed on first authenticated request. One player per subject (AUTH-001).';
