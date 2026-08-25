---
paths:
  - "farhat_football_app/Apis/**/*"
  - "farhat_football_app/server.cjs"
  - "farhat_football_app/app.cjs"
  - "farhat_football_app/db.cjs"
---

# Backend rules

Loaded when working in the Express API. CommonJS `.cjs` on a shared `pg` pool — no ORM, no
repository layer, no validation library. General execution traps are the
[`repo-pitfalls`](../skills/repo-pitfalls/SKILL.md) skill; schema and SQL semantics are the
[`database-changes`](../skills/database-changes/SKILL.md) skill; the module and route inventory is
[`.cursor/REPO_MAP.md`](../../.cursor/REPO_MAP.md).

## Structure

Each domain under `Apis/<domain>/` follows `routes.cjs → controller.cjs → queries.cjs`:

- **`queries.cjs`** exports named SQL template strings using `$1` placeholders. Nothing else.
- **`controller.cjs`** requires `../../db.cjs` and calls `pool.query(sqlString, [params])`,
  shapes the response, handles errors.
- **`routes.cjs`** builds an Express `Router`, applies guards, maps paths to controller methods.

`Apis/leaderboard/` deviates — three self-contained routers (`leaderboard.cjs`,
`seasonal-leaderboard.cjs`, `eleven-aside-leaderboard.cjs`), each a single `GET /`, with no
controller/queries split. Match whichever pattern the module you are editing already uses.

- New backend file → **`.cjs`**. The package is `"type": "module"`.
- The `pg` pool is one shared module (`db.cjs`) required directly. Do not create a second pool.
- Parameterise every user value as `$1`, `$2`. Never interpolate into the SQL string.
- No new dependencies without checking `farhat_football_app/package.json` first and asking.

## Route ordering

Two ordering rules, both of which fail silently:

1. **Parameterised catch-alls last** within each router — `/:player_id` above `/check` makes
   `/check` unreachable. Existing routers mark the boundary in comments; keep them.
2. **Mount before the SPA catch-all** in `app.cjs`. `app.get("*")` returns `index.html` for
   anything below it, so a late-mounted API route serves HTML instead of JSON.
   `tests/backend/app.test.js` pins this, and the error-handler arity, so both now fail loudly.

Routers are mounted at `/api/v1/<name>` inside `createApp()` in `app.cjs` — `server.cjs` only
listens (TEST-002). `/api/v1/payments` has `checkJwt` applied at the **mount point** **and** repeated on every route in
`Apis/payments/routes.cjs`. The repetition is redundant, not load-bearing; leave it alone unless
you are deliberately tidying it, and do not infer from it that other routers guard themselves.

## Authorization

`checkJwt` (`express-oauth2-jwt-bearer`) validates the Auth0 token and populates
`req.auth.payload`. Every guard after it resolves the caller through **one** shared resolver,
`Apis/auth/identity.cjs`, which maps the token's immutable `sub` claim to exactly one player and
reads `is_admin` / `is_superadmin` from that row (AUTH-001). **Never trust a player id or admin
flag sent in the request body, and do not add a second lookup by email** — email is mutable, and
resolving by it is the defect that ticket removed.

Accounts predating the column are claimed on first authenticated request: matched to one
unclaimed row by email, then bound permanently. `resolvePlayer(req)` returns `{ player }` or
`{ player: null, reason }`, where reason distinguishes no-subject, no-account, unverified-email
and ambiguous-email. Guards map those to responses; do not collapse them back into one.

Every guard, and `identity.cjs` itself, exports a factory taking a pool so it can be unit tested
with a fake — see [`testing.md`](testing.md) §Injection.

| Guard | Grants |
|---|---|
| `requireAdmin()` | global `is_admin` |
| `requireAdmin({ superadmin: true })` | `is_superadmin` |
| `requireHostAdmin()` | admin of the host owning `req.params.match_id` |
| `requireHostAdmin({ source: "body" })` | admin of `req.body.host_id` (defaults to the default host; the value is normalised onto `req.body`) |
| `requireSelfOrAdmin` | the player themselves (`req.params.player_id`), or a global admin |
| `requireSelfOrHostAdmin` | the player themselves (`req.body.player_id`), or an admin of the host owning `req.body.match_id`. Exposes the validated target as `req.targetPlayerId` — controllers must read that, never `req.body.player_id` |

Guards run **after** `checkJwt` and set `req.player` (and `req.hostId`). `requireHostAdmin` also
exports `getDefaultHostId`, `isHostAdmin`, `getCaller` for reuse.

Superadmin is admin everywhere; a global `is_admin` is admin of the **default host only**; any
other host requires a `host_admins` row. Resources shared across all portals — attributes,
pitches — are gated on the global/superadmin guards rather than host admin.

Adding an admin surface is a **two-edit** change: the server guard on the route **and** the
matching `Protected*Route` on the frontend ([`frontend.md`](frontend.md) §Route guards). The
server guard is the real check; the frontend one is UI gating only. Shipping only the frontend
half leaves the endpoint open.

Do not reintroduce `Apis/auth/checkAdmin.cjs` — it was dead, checked a placeholder claim
namespace, and REPO-003 deleted it. `requireAdmin` is the real guard.

## Host scoping

`matches.host_id` scopes a match to a portal; `bans.host_id` is nullable and `NULL` means a
global ban. When adding a resource that belongs to a portal, carry `host_id` on the row and
authorise with `requireHostAdmin` rather than `requireAdmin`.

## Payments

`payments` rows are the single source of truth for `players.account_balance` — an `AFTER INSERT`
trigger applies the signed amount. **Never `UPDATE account_balance` from application code**;
insert a payment row (negative amount for a charge). Keep `ON CONFLICT (transaction_id) DO
NOTHING` on payment inserts: a suppressed insert does not fire the trigger, which is what makes
retried webhooks safe.

The Monzo webhook handler lives in `Apis/payments/monzoWebhook.cjs` and is mounted in
`app.cjs` before the SPA catch-all. It always responds 200.

**Inbound webhook payloads are untrusted input, and are treated as one here.** The body is read
only for a transaction id; the transaction is then re-fetched from Monzo under our own
credentials, and every value written to the ledger comes from that copy. `verifyTransaction` is
pure and unit tested — extend it rather than adding checks in the handler. An event that cannot
be verified writes nothing and is left for `runFullPaymentSync` to pick up.

## Style

Tabs, matched by hand — ESLint covers `.cjs` since QA-001 but does not enforce indentation.
`npm run lint` must stay at **0 errors**, and CI runs it plus `node --check` over every `.cjs`
file. No comments narrating what the code does — comments are for non-obvious business logic or
technical constraints only.
