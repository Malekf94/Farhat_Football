---
paths:
  - "farhat_football_app/Apis/**/*"
  - "farhat_football_app/server.cjs"
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
2. **Mount before the SPA catch-all** in `server.cjs`. `app.get("*")` at `server.cjs:151` returns
   `index.html` for anything below it, so a late-mounted API route serves HTML instead of JSON.

Routers are mounted at `/api/v1/<name>` in `server.cjs:134-145`. `/api/v1/payments` has
`checkJwt` applied at the **mount point**, so its own routes do not repeat it.

## Authorization

`checkJwt` (`express-oauth2-jwt-bearer`) validates the Auth0 token and populates
`req.auth.payload`. Every guard after it resolves the caller's email **from the verified token**
(standard `email` claim, or the namespaced `AUTH0_EMAIL_CLAIM`), looks the player up by email,
and reads `is_admin` / `is_superadmin` from the DB row. **Never trust a player id or admin flag
sent in the request body.**

| Guard | Grants |
|---|---|
| `requireAdmin()` | global `is_admin` |
| `requireAdmin({ superadmin: true })` | `is_superadmin` |
| `requireHostAdmin()` | admin of the host owning `req.params.match_id` |
| `requireHostAdmin({ source: "body" })` | admin of `req.body.host_id` (defaults to the default host; the value is normalised onto `req.body`) |
| `requireSelfOrAdmin` | the player themselves, or an admin |

Guards run **after** `checkJwt` and set `req.player` (and `req.hostId`). `requireHostAdmin` also
exports `getDefaultHostId`, `isHostAdmin`, `getCaller` for reuse.

Superadmin is admin everywhere; a global `is_admin` is admin of the **default host only**; any
other host requires a `host_admins` row. Resources shared across all portals — attributes,
pitches — are gated on the global/superadmin guards rather than host admin.

Adding an admin surface is a **two-edit** change: the server guard on the route **and** the
matching `Protected*Route` on the frontend ([`frontend.md`](frontend.md) §Route guards). The
server guard is the real check; the frontend one is UI gating only. Shipping only the frontend
half leaves the endpoint open.

Do not use `Apis/auth/checkAdmin.cjs` — it is dead and checks a placeholder claim namespace.

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

The Monzo webhook is inline in `server.cjs:77-130`, not in `Apis/`. It always responds 200.

**Inbound webhook payloads are untrusted input.** Verify provenance before any ledger write, and
never derive an amount, account or transaction id from the request body alone. Hardening this
path is tracked as `SEC-001` in the local security assessment — check its current state with the
maintainer before changing anything here.

## Style

Tabs. ESLint does **not** cover `.cjs`, so match the surrounding file by hand and syntax-check
with `node --check <file>.cjs`. No comments narrating what the code does — comments are for
non-obvious business logic or technical constraints only.
