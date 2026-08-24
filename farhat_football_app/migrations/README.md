# Migrations

Every schema change after the baseline lives here as a numbered file. The runner is
[`../scripts/migrate.cjs`](../scripts/migrate.cjs); the operator procedure is in
[`../SETUP.md`](../SETUP.md) under *Database schema and migrations*.

## Filename

```
NNNN_short_description.sql
```

`NNNN` is a four-digit version, applied in ascending order. `0000` is reserved — it is the
repo-root `schema.sql` baseline. Start at `0001`. The runner refuses a filename it cannot parse
and refuses a duplicate version, rather than guessing an order.

## Writing one

Each file runs inside **one transaction** and is recorded in `public.schema_migrations` only if
it commits, so a failure leaves nothing half-applied.

- Keep it re-runnable where it costs nothing — `IF NOT EXISTS`, `CREATE OR REPLACE`,
  `DROP ... IF EXISTS`. The ledger stops a migration running twice, but production has been
  hand-managed and an object may already exist.
- Schema-qualify every object (`public.players`). The baseline ends by setting `search_path` to
  empty, so an unqualified name may not resolve.
- Never `UPDATE players.account_balance`. Balance is owned by the `AFTER INSERT` trigger on
  `payments`; a migration that needs to change a balance inserts a `payments` row.
- One concern per migration. It is the unit that succeeds or fails.

## Immutability

An applied migration is frozen. The runner stores a checksum of each file and refuses to
continue if a recorded file has changed, because the database and the file no longer agree.
Correct a mistake with a new migration, not by editing an old one.

## Rollback

There are no `down` files. Rolling a schema change back means writing the next migration that
reverses it, which is what actually happens under pressure — a `down` written months earlier and
never executed is not a rollback plan. Deploys are therefore expand-then-contract: add the new
shape, ship the code that uses it, remove the old shape in a later migration, so the previous
release still runs against the migrated database.
