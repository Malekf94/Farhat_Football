---
name: repo-pitfalls
description: >-
  Verified traps in the Farhat Football repo that silently produce wrong behaviour or waste a
  session. Use before running any npm, node, git or PowerShell command; before adding an Express
  route; before touching payments, balances or schema; when a command fails in a way that looks
  impossible; and before trusting any doc, comment or existing file that looks load-bearing.
---

# Known pitfalls

Distilled operational rules. Each carries its source so it can be re-verified rather than trusted.

**Confidence tags** — **[V]** verified directly against this checkout (date given);
**[I]** inherited, not re-verified — trust but confirm before relying.

Append a rule here only once it generalises. Keep the reasoning short and cite `file:line`.

---

## Project shape

- **[V 2026-08-24] Every command runs from `farhat_football_app/`, never the repo root.** It is
  the repository's only npm package. Until REPO-001 the root also carried a `package.json` with
  no scripts and a separate 133-package lockfile that pinned four of the app's dependencies at
  **different** versions (`@getbrevo/brevo` 3 vs 5, `dotenv` 17 vs 16, `express-oauth2-jwt-bearer`
  1.7 vs 1.9); nothing at the root ever required them. Both root files are now deleted — if a
  `package.json` reappears at the root, it is a mistake, not a second install target.
- **[V 2026-08-21] Backend files must keep the `.cjs` extension.** The package is
  `"type": "module"` (`farhat_football_app/package.json:5`), so a backend file named `.js` is
  parsed as ESM and `require()` throws. New backend file → `.cjs`; new frontend file → `.jsx`.
- **[V 2026-08-24] ESLint covers the backend since QA-001, and the baseline is green.** A
  `**/*.cjs` block in `eslint.config.js` lints all 37 backend files (~3,700 lines) with node
  globals and `sourceType: 'commonjs'`. `npm run lint` must report **0 errors**; warnings are
  capped at 5 by `--max-warnings 5` in the lint script, so a new warning fails too. Match
  surrounding style (tabs) by hand — no formatter is wired up.
- **[V 2026-08-24] Never delete `next` from an Express error handler to satisfy
  `no-unused-vars`.** Express identifies an error handler by **arity** — it only receives errors
  if it declares four parameters — so the unused `next` in `server.cjs` is load-bearing.
  Removing it silently demotes the handler to ordinary middleware and errors stop being handled,
  with no error at startup. The `.cjs` lint block sets
  `'no-unused-vars': ['error', { argsIgnorePattern: '^next$|^_' }]` for exactly this.
- **[V 2026-08-24] Do not bulk-rewrite `catch (err)` to `catch {`.** Only some catch blocks
  discard the error. A blind `sed` over `PaymentsDashboard.jsx` and `ManageHosts.jsx` stripped
  the binding from blocks whose bodies still call `console.error(err)`, which would throw
  `ReferenceError` at runtime — the frontend build does **not** catch it, and lint only caught
  it because `no-undef` was already on. Change the sites the linter names, one at a time.
- **[V 2026-08-25] CI exists since TEST-001** — `.github/workflows/ci.yml` runs lint, backend
  `node --check`, `npm test`, `npm run build` and `npm run test:integration` (which validates
  the migration path) on every pull request into `zak-dev`, `staging` and `main`. Each gate was
  proven to block by deliberately breaking it. Run them locally first regardless. Tests live
  under `farhat_football_app/tests/` (`tests/frontend/**`, `tests/backend/**`), never colocated.
  See `unit-test-engineer`.
- **[V 2026-08-25] A GitHub Actions step name containing `: ` must be quoted.** `- name: npm
  audit (threshold: high)` is a YAML syntax error, and GitHub reports it only once the workflow
  is pushed. Parse the file locally (`python -c "import yaml, sys; yaml.safe_load(open(...))"`)
  before committing a workflow change — the round trip through a failed push is otherwise the
  first sign.
- **[V 2026-08-25] The audit gate is deliberately not blocking yet.** `.github/workflows/ci.yml`
  runs `npm audit --audit-level=high` under `continue-on-error: true`, because the tree carries
  1 critical and 5 high advisories and a blocking gate would have made every pull request red,
  including the one adding CI. **DEP-001 remediates them and flips it to blocking** — if you see
  `continue-on-error` still there after DEP-001, that is a regression, not a decision.
- **[V 2026-08-21] `vi.mock()` cannot intercept a `require()` inside a `.cjs` module, and the
  failure mode is a real database connection.** Mocking `../../db.cjs` works for a direct ESM
  `import` and does nothing for the `require()` inside `Apis/auth/requireHostAdmin.cjs`; mocking
  `pg` fails identically; `test.server.deps.inline` does not help. So importing any backend module
  from a test builds a real `pg` Pool from `DATABASE_URL` — during setup this reached a live
  server and returned `password authentication failed`. `tests/setup.js` now pins `DATABASE_URL`
  to an unreachable sentinel, and `tests/backend/db-guard.test.js` pins that guard. **Never
  weaken either, and never set a real `DATABASE_URL` in a test.** Consequence: backend units that
  touch the pool — controllers, guards, queries — are **not unit-testable as written**.
- **[V 2026-08-24] `schema.sql` cannot be loaded into the PostgreSQL major it came from.** The
  dump header says "Dumped from database version 16.13 ... Dumped by pg_dump version 17.1"
  (`schema.sql:4-5`), and pg_dump 17 emits `SET transaction_timeout = 0` at line 11 — a parameter
  PostgreSQL 16 does not have. Loading it into `postgres:16` aborts there under `ON_ERROR_STOP`.
  The integration harness strips that line at load time; the tracked file is still wrong and is
  `DB-001`'s to fix. Anyone restoring this dump to rebuild an environment hits it first.
- **[V 2026-08-24] `pg_isready` over the unix socket lies while a `postgres` container is still
  initialising.** The official image starts a **temporary** server during initdb that listens on
  the socket only, shuts it down, then starts the real one. Asking `pg_isready` without `-h`
  gets a "ready" from that temporary server, and the schema load then dies with
  `FATAL: the database system is shutting down` — intermittently, so it looks like a flake.
  Check readiness over **TCP** (`pg_isready -h 127.0.0.1`), which the initdb server never
  listens on. Fixed in `tests/integration/global-setup.js`.
- **[V 2026-08-24] Backend modules that require the pool ARE testable — against Docker.** The
  `vi.mock()` limit above is real but it is a limit on *unit* tests only. `npm run test:integration`
  seeds a throwaway `postgres:16` from `schema.sql` and drives guards and controllers directly.
  Before concluding "this cannot be tested", check
  [`.claude/rules/testing.md`](../../rules/testing.md) §Integration tests against a disposable
  database. No new dependency is involved.
- **[V 2026-08-21] Heredocs break on this repo's markdown.** Writing these skill files via
  `cat > file <<'EOF'` failed with an unmatched-quote parse error. Use the Write/Edit tools for
  any file over ~20 lines, especially one containing backticks, `$`, or apostrophes.

## Express routing

- **[V 2026-08-21] Parameterised catch-alls must be registered LAST in every router.** A
  `/:player_id` above `/check` swallows `/check` silently — the literal route becomes
  unreachable with no error. Existing routers mark the boundary with comments
  (`Apis/players/routes.cjs:44` "ALWAYS LAST"; `Apis/hosts/routes.cjs:33` "keep LAST";
  `Apis/matches/routes.cjs:38` "base id routes LAST"; `Apis/bans/routes.cjs:9` `/mine` before
  the public list). Respect them when inserting a route.
- **[V 2026-08-21] Any new API route must be mounted before the SPA catch-all.** `server.cjs:148`
  serves `dist/client` statically and `server.cjs:151` is `app.get("*")` → `index.html`. A route
  added after it returns the HTML shell instead of JSON, which reads as a mysterious parse error
  on the client, not as a 404.

## Authorization

- **[V 2026-08-21] Never trust a player id or admin flag from the request body.** Every guard
  resolves the caller's email from the **verified token** (`req.auth.payload` — standard `email`
  claim, or the namespaced `AUTH0_EMAIL_CLAIM`), then reads `is_admin` / `is_superadmin` from the
  DB (`Apis/auth/requireAdmin.cjs:7-33`). Guards must run **after** `checkJwt`.
- **[V 2026-08-21] `Apis/auth/checkAdmin.cjs` is dead and broken — do not wire it up.** Nothing
  imports it, and it checks a placeholder claim namespace, `https://your-app-url.com/roles`
  (`checkAdmin.cjs:6`), which no token will ever carry. `requireAdmin` is the real guard.
- **[V 2026-08-21] `requireHostAdmin` is not symmetric.** A superadmin is admin everywhere; a
  global `is_admin` is admin of the **default host only**; every other host needs an explicit
  `host_admins` row (`Apis/auth/requireHostAdmin.cjs:41-56`). Do not assume `is_admin` grants
  access to a portal.
- **[V 2026-08-21] Frontend `Protected*Route` guards are UI gating only.** Adding an admin page
  without a matching server guard leaves the endpoint open. The server guard is the real check.
- **[V 2026-08-21] `privateApi` retries a 401 once with a fresh token; a 403 is deliberately not
  retried** (`src/api.jsx:46-71`). If you see an endless auth loop, it is not this interceptor.

## Payments and balances

- **[V 2026-08-21] Never `UPDATE players.account_balance` from application code.** An
  `AFTER INSERT` trigger on `payments` applies the signed amount
  (`payment_balance_trigger.sql`). Insert a payment row instead — negative amount for a charge.
  Writing the column directly double-counts against the trigger.
- **[V 2026-08-21] `Apis/payments/syncPayments.cjs` is deprecated and disabled — never run it.**
  Its own header says running the old balance sync "would DOUBLE every unprocessed payment"
  (`syncPayments.cjs:1-9`). It now only prints a warning.
- **[V 2026-08-21] Duplicate protection depends on `ON CONFLICT (transaction_id) DO NOTHING`.**
  A suppressed insert writes no row and therefore does **not** fire the trigger, which is exactly
  why retried Monzo webhooks cannot double-credit (`server.cjs:111-118`). Preserve both halves —
  the conflict clause and the trigger-on-insert design — when touching payment writes.
- **[V 2026-08-21] The Monzo webhook lives inline in `server.cjs:77-130`, not in `Apis/`.** It
  attributes a payment by matching `ffc<player_id>` in the transaction notes and **always**
  responds 200 so Monzo does not retry — including on error. A failure there is invisible to
  Monzo; check the server log, not the webhook response.

## Database

- **[V 2026-08-21] `payments.user_id` is the player FK, not `player_id`** (`all_tables.txt:69`,
  and every payments query). Writing `payments.player_id` fails at the DB, and it is the single
  most repeated mistake in this schema.
- **[V 2026-08-24] Since DB-001 there IS a migration runner** — `scripts/migrate.cjs`, built on
  the `pg` client already in `package.json`. `schema.sql` is baseline `0000`; changes after it
  are numbered files in `farhat_football_app/migrations/`, recorded in
  `public.schema_migrations`. **Never edit an applied migration** — the runner checksums each
  one and refuses to continue if a recorded file changed. Still write re-runnable SQL and
  **schema-qualify every object**: the baseline ends with
  `SELECT pg_catalog.set_config('search_path', '', false)`, so an unqualified `schema_migrations`
  or `players` resolves to nothing for the rest of the session. See `database-changes`.
- **[V 2026-08-24] `schema.sql` now loads into PostgreSQL 16 unedited.** DB-001 removed the
  `SET transaction_timeout = 0` that pg_dump 17 emits and PostgreSQL 16 rejects, and the
  integration harness no longer strips it. **Regenerate the dump with pg_dump 16.x** — using 17
  reintroduces the line and breaks provisioning everywhere at once.
- **[V 2026-08-21] `all_tables.txt` is a stale early snapshot — do not treat it as the schema.**
  It predates `hosts`, `host_admins`, `bans`, `match_player_ratings`, `players.is_admin` /
  `is_superadmin`, and `matches.host_id`. The authoritative schema is the hosted DB;
  `dump (1).sql` is a dump of it but is 1.5 MB — grep, never read.
- **[V 2026-08-21] `match_players.team_id = 0` means reserves**, not a team — see `removeReserves`
  in `Apis/matches/queries.cjs`. The old snapshot's `CHECK (team_id = 1 OR team_id = 2)` no
  longer reflects reality.

## Stale and dead things

- **[V 2026-08-24] The root `readme.md` used to describe a layout that does not exist** —
  `client/` + `server/` + `database/`, separate installs, `JWT_SECRET`, port 5000. REPO-003
  rewrote those sections to match reality. `farhat_football_app/SETUP.md` remains the
  authoritative setup doc; the readme is the product overview and defers to it.
- **[V 2026-08-24] `randomisermk3.js` at the repo root is LIVE — do not delete it.** The
  pitfall list previously called it a standalone experiment; it is not.
  `src/Pages/IndividualMatch/IndividualMatch.jsx:7` imports `randomiserMk3` from
  `../../../../randomisermk3`, and that page is routed in `src/App.jsx:9`. So the team balancer
  the app actually runs lives **outside** the npm package, reached by a four-level relative
  climb out of `farhat_football_app/`. Anything that assumes the package is self-contained —
  a container build that copies only `farhat_football_app/`, a move of the app directory —
  breaks the balancer. `randomisermk2.js` really was dead and REPO-003 deleted it.
- **[V 2026-08-24] Dead code that looks load-bearing.** REPO-003 deleted the code entries
  below; they are kept here so a reappearance is recognised, not resurrected:
  `farhat_football_app/models/index.js` (Sequelize scaffold — `sequelize` is not a dependency
  and it required a `config/config.json` that never existed; it also produced **11 of the 17**
  baseline lint errors), `farhat_football_app/config/config.cjs` (only consumed by that
  scaffold), `Apis/auth/checkAdmin.cjs` (never imported; placeholder claim namespace),
  `Apis/payments/syncPayments.cjs` (deprecated; would have doubled balances),
  `src/Pages/UpcomingMatch/` and `src/Pages/YourPage/` (never imported or routed), and
  `randomisermk2.js`. Still present and still dead:

  | Path | Why |
  |---|---|
  | `set_first_player_as_admin()` (DB function) | Defined in `schema.sql`; **no** `CREATE TRIGGER` references it. Inserting the first player does not make them an admin. |
  | `feedback`, `replies` tables | Present in the old schema snapshot; no backend code references them. |

  Live despite looking otherwise: `Apis/payments/runFullPaymentSync.cjs` (called by
  `Apis/payments/controller.cjs:2,22,62`) and `Apis/payments/checkPayments.cjs` (spawned via
  `exec("node Apis/payments/checkPayments.cjs")` at `controller.cjs:8` — a reference no
  `import`/`require` grep will find). There is **no** `Apis/match_players/balancer.cjs`.

- **[V 2026-08-21] A negative claim in a doc is the most dangerous kind** — it tells you not to
  look. `.cursor/REPO_MAP.md` asserted a `migrations/` directory, a `balancer.cjs`, a Recharts
  dependency and `payments.player_id`, none of which were real. Nothing in this repo drift-checks
  the context layer, so verify a claim in a skill, in `REPO_MAP.md` or in `CLAUDE.md` against the
  code before relying on it, and correct it in place when it is wrong.

## Environment

- **[V 2026-08-21] Never read or print `farhat_football_app/.env`.** It holds real production
  credentials (database URL, Monzo token, Brevo key, Auth0 client secret). It is gitignored and
  denied in `.claude/settings.json`. Env var **names** are in `.env.example`.
- **[V 2026-08-21] `checkJwt` reads the audience from `VITE_AUTH0_AUDIENCE`, not `AUTH0_AUDIENCE`**
  (`Apis/auth/checkJwt.cjs:4`) — a `VITE_`-prefixed variable consumed by the **backend**. Renaming
  it to look tidier breaks all token validation with an opaque 401.
- **[V 2026-08-21] The Vite dev proxy is bypassed in the documented setup.** `vite.config.js:13`
  proxies `/api` → `:3000`, but `src/api.jsx:6,11` sets an absolute `baseURL` from
  `VITE_API_BASE_URL`, which `.env.example:27` sets to `http://localhost:3000`. Requests go
  direct and rely on the server's CORS `origin: FRONTEND_URL` (`server.cjs:46-53`) instead. If
  local calls suddenly 404 or hit CORS, check which of the two paths is actually in play.
- **[V 2026-08-21] With `VITE_API_BASE_URL` unset, both axios instances fall back to
  `http://localhost:5000`** (`src/api.jsx:6,11`) — a port nothing listens on. The API is `:3000`.
  A "server not responding" symptom on a fresh clone is usually a missing `.env`, not a dead API.
- **[V 2026-08-21] `prop-types` is imported but not declared.** `src/components/RadarChart.jsx:1`
  and `src/context/HostContext.jsx:3` import it; it is absent from `package.json` and resolves
  transitively today. A dependency bump that drops it breaks the build with a confusing
  module-not-found. Add it explicitly if you touch either file's dependencies.
- **[I] PowerShell here is 5.1.** No `&&`, `||`, ternary, `??` or `?.` — use `A; if ($?) { B }`.
  Avoid merging a native executable's stderr (`2>&1`, `*>`): PS 5.1 wraps each stderr line in a
  `NativeCommandError` and sets `$?` to `$false` even on exit code 0. The Bash tool is available
  and avoids all of this.

## Branch workflow

- **[V 2026-08-21] `main` is production and is PR-only; `staging` is the staging deploy.**
  Branch off `staging`, PR into `staging`, test there, then PR `staging → main`
  (`farhat_football_app/SETUP.md:42-50`). Never commit straight to `main`.
