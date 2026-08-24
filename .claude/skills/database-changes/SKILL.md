---
name: database-changes
description: >-
  PostgreSQL schema, indexes and triggers for Farhat Football, which has no migration tool. Use
  when adding or altering a table, column, index, constraint or trigger; when writing SQL in
  Apis/**/queries.cjs; when reasoning about payments and account balances; and before trusting
  any schema doc in this repo.
---

# Database changes

PostgreSQL accessed through a single shared `pg` pool (`db.cjs`). No ORM, no query builder, no
migration tool. Table inventory: `.cursor/REPO_MAP.md`. Traps: `repo-pitfalls`.

## There is no migration tool

No `migrations/` directory, no Alembic/Knex/node-pg-migrate, nothing in `package.json`. Schema
work is a **hand-written `.sql` file at the repo root**, applied manually against the hosted DB.
The existing examples are `add_indexes.sql` and `payment_balance_trigger.sql`.

Write every such file to be **re-runnable**, because it will be run more than once and there is
no record of what has already been applied:

- `CREATE INDEX IF NOT EXISTS ...`
- `CREATE OR REPLACE FUNCTION ...`
- `DROP TRIGGER IF EXISTS ... ; CREATE TRIGGER ...`
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`

Lead the file with a comment block explaining what it does and that it is safe to re-run — both
existing files do this. Applying it is the owner's manual step; say so rather than assuming a
deploy will pick it up.

## Finding the real schema

There is no single trustworthy schema file in the repo:

| Source | Status |
|---|---|
| The hosted database | Authoritative |
| `dump (1).sql` | A dump of it — **1.5 MB, grep only, never read** |
| `all_tables.txt` | **Stale.** Predates `hosts`, `host_admins`, `bans`, `match_player_ratings`, `players.is_admin`/`is_superadmin`, `matches.host_id` |
| `triggers.txt` | Snapshot; verify against the DB |
| `.cursor/REPO_MAP.md` | Column list assembled from live query code — good orientation, still worth confirming |

When a column matters, confirm it from the queries that use it in `Apis/**/queries.cjs` rather
than from a snapshot file.

## Known schema facts worth not relearning

- **`payments.user_id` is the player FK**, not `player_id`.
- **`match_players.team_id = 0` means reserves**, not a team.
- `match_status` values in use: `pending`, `in_progress`, `completed`, `friendly`.
- `bans.host_id` is nullable — `NULL` is a **global** ban, not an orphan row.
- `matches.host_id` scopes a match to a portal.
- `feedback` and `replies` exist in the old snapshot but no backend code references them.

## Payments and balances

`players.account_balance` is maintained **entirely** by an `AFTER INSERT` trigger on `payments`
(`trg_apply_payment`, see `payment_balance_trigger.sql`), which adds the signed amount: positive
for a top-up or refund, negative for a match fee, leave penalty or manual charge.

- **Application code must never `UPDATE account_balance` directly.** Insert a payment row.
- Duplicate protection is `ON CONFLICT (transaction_id) DO NOTHING`. A suppressed insert writes
  no row, so the trigger does not fire and a retried webhook cannot double-credit. Both halves
  are load-bearing.
- `Apis/payments/syncPayments.cjs` is the pre-trigger sync and is **disabled** — running it would
  double every unprocessed payment.

## SQL in application code

- Queries are named template strings in `Apis/<domain>/queries.cjs`, using `$1` placeholders.
- Controllers call `pool.query(sqlString, [params])`. Parameterise every user value; never
  interpolate into the string.
- Foreign-key columns are not indexed automatically in PostgreSQL — `add_indexes.sql` exists
  because leaderboard and stats aggregations were doing sequential scans. If you add a query
  that filters or joins on a new column, consider whether it needs an index, and add it to a
  re-runnable root `.sql` file rather than assuming one exists.
