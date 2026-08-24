# Farhat Football — Repository Map

> Primary LLM navigation index. Read this before opening any source file.
> Update incrementally when new modules or conventions are discovered. Do not regenerate wholesale.
>
> Last verified against the tree: 2026-08-16.

---

## Summary

Full-stack football session management platform. Weekly football games are organised via a React/Vite single-page app backed by an Express API, a PostgreSQL database, and Auth0 JWT authentication. Key capabilities: player profiles, match creation, attendance/payment tracking, player-voted ratings, bans, and multiple leaderboards.

The app is **multi-tenant**: it serves several portals ("hosts"). The default portal lives at the root path; other portals live under `/h/:slug`. See _Hosts / multi-tenancy_ below.

---

## Project Layout

```
Farhat_football/
├── farhat_football_app/        # ONE npm package: React frontend + Express backend
│   ├── server.cjs              # Express entry point, middleware, route mounting, Monzo webhook
│   ├── db.cjs                  # pg connection pool (shared across all APIs)
│   ├── package.json            # The ONLY manifest in the repo — no package.json at the root
│   ├── vite.config.js          # Build -> dist/client; dev proxy /api -> :3000
│   ├── eslint.config.js        # Covers **/*.{js,jsx} AND **/*.cjs — backend is linted
│   ├── .env.example            # Env var names (.env is gitignored — never read it)
│   ├── SETUP.md                # Local setup + branch/deploy workflow
│   ├── src/                    # React frontend (ESM / JSX)
│   │   ├── App.jsx             # Route definitions, Auth0 interceptor setup
│   │   ├── api.jsx             # Axios publicApi/privateApi + JWT interceptor
│   │   ├── Protected*Route.jsx # 4 route guards (see Shared Frontend Pieces)
│   │   ├── Pages/              # One subfolder per page: <Name>.jsx + <Name>.css
│   │   ├── components/
│   │   ├── context/HostContext.jsx
│   │   └── hooks/
│   ├── Apis/                   # Backend REST modules (CommonJS .cjs)
│   │   ├── auth/  players/  matches/  match_players/
│   │   ├── attributes/  payments/  pitches/
│   │   ├── hosts/  bans/  leaderboard/
│   ├── tests/                  # Vitest: backend/ frontend/ (unit), integration/ (Docker)
│   └── scripts/                # empty
├── add_indexes.sql             # Hand-applied performance indexes
├── payment_balance_trigger.sql # Hand-applied payments -> account_balance trigger
├── CLAUDE.md                   # Guidance for Claude Code
├── readme.md                   # Product overview; structure/install/run corrected by REPO-003
├── all_tables.txt              # STALE early schema snapshot (pre-hosts, pre-admin flags)
├── triggers.txt                # Trigger snapshot
├── randomisermk3.js            # LIVE team balancer — imported by src/Pages/IndividualMatch
└── dump (1).sql                # DB dump — authoritative schema, but DO NOT READ (1.5 MB)
```

**Do not read by default:** `node_modules/`, `dist/`, `package-lock.json`, `dump (1).sql`, `.env`.

**There is no** `migrations/`, `docs/`, `plan.md`, `.github/workflows/`, or root `scripts/`.
There **is** a Vitest suite under `farhat_football_app/tests/` — see Commands below.

---

## Commands

All run from `farhat_football_app/`:

| Command | Effect |
|---|---|
| `npm run dev` | API (nodemon, :3000) + Vite client (:5173) together |
| `npm run server` | API only |
| `npm run client` | Vite dev server only |
| `npm run build` | `vite build` → `dist/client` |
| `npm run lint` | `eslint .` |
| `npm test` | Vitest — unit specs under `tests/backend/` and `tests/frontend/` only |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:integration` | Vitest against a disposable `postgres:16` container (needs Docker) |

**CI runs both suites, lint, backend syntax, build and migration validation on every pull request** (`.github/workflows/ci.yml`, TEST-001). Tests
live in `farhat_football_app/tests/` (`tests/frontend/**` mirroring `src/`, `tests/backend/**`
mirroring `Apis/`), never colocated. Backend modules that require the `pg` pool cannot be mocked —
see the `unit-test-engineer` skill. Verification is `npm test` + `npm run lint` + manual exercise
via `npm run dev`.

---

## Entry Points

| File | Role |
|---|---|
| `farhat_football_app/server.cjs` | Express app, middleware stack, route mounting, Monzo webhook |
| `farhat_football_app/src/App.jsx` | React Router routes, Auth0 interceptor bootstrap |
| `farhat_football_app/db.cjs` | PostgreSQL `pg` pool — imported by all query files |
| `farhat_football_app/src/api.jsx` | Axios `publicApi` + `privateApi`, JWT interceptor, 401 retry |
| `farhat_football_app/src/context/HostContext.jsx` | Current portal (`useHost`, `hostPath`) |

---

## Backend API Modules (`farhat_football_app/Apis/`)

Each module follows `routes.cjs → controller.cjs → queries.cjs`, where `queries.cjs` exports named SQL template strings using `$1` placeholders and the controller calls `pool.query(...)`. **`leaderboard/` deviates** — three self-contained routers with no controller/queries split.

| Module | Mounted at | Key files | Responsibility |
|---|---|---|---|
| `auth/` | `/api/v1/auth` | `checkJwt.cjs`, `requireAdmin.cjs`, `requireHostAdmin.cjs`, `requireSelfOrAdmin.cjs`, `routes.cjs` | JWT validation, authorization guards; `routes.cjs` is just the Auth0 code-exchange endpoint |
| `players/` | `/api/v1/players` | routes/controller/queries | Player CRUD, email lookup, stats, career, per-player payments |
| `matches/` | `/api/v1/matches` | routes/controller/queries | Match lifecycle, man of the match, player notifications |
| `match_players/` | `/api/v1/matchPlayer` | routes/controller/queries | Roster join/leave, team assignment, per-match stats, player-voted ratings |
| `attributes/` | `/api/v1/attributes` | routes/controller/queries | Skill attribute ratings; **global across hosts — superadmin only to edit** |
| `payments/` | `/api/v1/payments` | `controller.cjs`, `checkPayments.cjs`, `runFullPaymentSync.cjs`, `leavinggame.cjs`, `monzoWebhook.cjs` | Payment dashboard, Monzo sync, refunds, balance audit/reconcile, leave charges |
| `pitches/` | `/api/v1/pitches` | routes/controller/queries | Pitch management (add = global admin) |
| `hosts/` | `/api/v1/hosts` | routes/controller/queries | Portal resolution by slug, host CRUD + host-admin management (superadmin) |
| `bans/` | `/api/v1/bans` | routes/controller/queries | Player bans per host (or global), incl. auto-bans driven by late counts |
| `leaderboard/` | `/api/v1/leaderboard`, `/api/v1/seasonal-leaderboard`, `/api/v1/eleven-aside-leaderboard` | `leaderboard.cjs`, `seasonal-leaderboard.cjs`, `eleven-aside-leaderboard.cjs` | Three leaderboard views, each a single `GET /` |

Note: `/api/v1/payments` is mounted with `checkJwt` applied at the mount point in `server.cjs`.

**Route ordering:** parameterised catch-alls (`/:player_id`, `/:slug`, `/:match_id`) must be registered **last** in each router, after literal paths like `/check`, `/mine`, `/lates`, `/all/:status`. Existing routers mark this with comments; getting it wrong silently swallows the literal route.

**Catch-all:** `server.cjs` serves `dist/client` and ends with `app.get("*")` → `index.html`. Any new API route must be mounted **before** it.

---

## Hosts / multi-tenancy

- Default portal slug comes from `DEFAULT_HOST_SLUG` (default `farhat`) and has **no slug segment** in the URL. Other portals are `/h/:slug/...`.
- In `App.jsx`, `PortalRoutes()` is rendered **twice** — once at the root, once nested under `/h/:slug` — both wrapped in `HostLayout` → `HostProvider`. Portal-scoped routes go inside `PortalRoutes()`; global pages sit outside it.
- Frontend must build internal links with `hostPath("/matches")` from `useHost()` so navigation stays inside the active portal.
- `matches.host_id` scopes a match to a portal. `bans.host_id` is nullable — `NULL` means a global ban.

---

## Frontend Routes (`farhat_football_app/src/App.jsx`)

**Portal-scoped** (rendered at both `/` and `/h/:slug/`):

| Path | Component | Auth |
|---|---|---|
| `` (index) | `Home/Home.jsx` | public |
| `matches` | `Matches/Matches.jsx` | public |
| `matches/:match_id` | `IndividualMatch/IndividualMatch.jsx` | `ProtectedRoute` |
| `leaderboard` | `LeaderBoard/LeaderBoard.jsx` | public |
| `seasonal-leaderboard` | `SeasonalLeaderBoard/SeasonalLeaderBoard.jsx` | public |
| `eleven-aside-leaderboard` | `ElevenLeaderBoard/ElevenLeaderBoard.jsx` | public |
| `lates` | `Lates/Lates.jsx` | public |
| `create-match` | `CreateMatch/CreateMatch.jsx` | `ProtectedHostAdminRoute` |

**Global** (not host-scoped):

| Path | Component | Auth |
|---|---|---|
| `/rules` | `Rules/Rules.jsx` | public |
| `/faq` | `FAQ/FAQ.jsx` | public |
| `/login` | `LoginPage/LoginPage.jsx` | public |
| `/players` | `Players/Players.jsx` | public |
| `/players/:player_id` | `PlayerDetails/PlayerDetails.jsx` | public |
| `/compare` | `PlayerComparison/PlayerComparison.jsx` | public |
| `/create-account` | `CreateAccount/CreateAccount.jsx` | public |
| `/attribute-leaderboard` | `StatLeaderBoard/StatLeaderBoard.jsx` | public |
| `/your-account` | `AccountDetails/AccountDetails.jsx` | `ProtectedRoute` |
| `/payment-dashboard` | `PaymentsDashboard/PaymentsDashboard.jsx` | `ProtectedRoute` |
| `/add-pitch` | `AddPitch/AddPitch.jsx` | `ProtectedAdminRoute` |
| `/update-attributes` | `UpdateAttributes/UpdateAttributes.jsx` | `ProtectedSuperAdminRoute` |
| `/manage-hosts` | `ManageHosts/ManageHosts.jsx` | `ProtectedSuperAdminRoute` |

`Pages/Header/` is rendered outside `<Routes>` on every page. `Pages/UpcomingMatch/` and `Pages/YourPage/` are unreferenced — see Dead Code.

---

## Shared Frontend Pieces

| Path | Purpose |
|---|---|
| `src/ProtectedRoute.jsx` | Requires Auth0 login |
| `src/ProtectedAdminRoute.jsx` | Requires login + `is_admin` |
| `src/ProtectedHostAdminRoute.jsx` | Requires admin rights over the active host |
| `src/ProtectedSuperAdminRoute.jsx` | Requires `is_superadmin` |
| `src/Auth0ProviderWithNavigate.jsx` | Auth0 provider wired to the router |
| `src/context/HostContext.jsx` | `HostProvider`, `useHost()` → `{ host, hostId, slug, isDefault, hostPath }` |
| `src/components/HostLayout.jsx` | Wraps a route group in `HostProvider` |
| `src/hooks/useCurrentPlayer.jsx` | Current player + `is_admin` / `is_superadmin` via `/players/check` |
| `src/hooks/useMyHosts.jsx` | Hosts the caller can administer (portal switcher) |
| `src/components/RadarChart.jsx` | **Hand-rolled** SVG radar of 6 FIFA-style categories (`computeRadarStats`). Not Recharts — Recharts is not a dependency. |
| `src/components/ConfirmModal.*` | Reusable confirmation dialog |
| `src/components/UpdateBanner.*` | New-version banner |

> `prop-types` is imported by `RadarChart.jsx` and `HostContext.jsx` but is **not declared** in `package.json` — it currently resolves transitively.

---

## Authorization

`checkJwt` validates the Auth0 access token (`express-oauth2-jwt-bearer`) and populates `req.auth.payload`. Every guard after it resolves the caller's **email from the verified token** (standard `email` claim, or the namespaced `AUTH0_EMAIL_CLAIM`), looks the player up in the DB, and reads `is_admin` / `is_superadmin` from there. **Never trust a player id or admin flag sent in the request body.**

| Guard | Grants |
|---|---|
| `requireAdmin()` | global `is_admin` |
| `requireAdmin({ superadmin: true })` | `is_superadmin` |
| `requireHostAdmin()` | admin of the host owning `req.params.match_id` |
| `requireHostAdmin({ source: "body" })` | admin of `req.body.host_id` (defaults to the default host; value is normalised onto `req.body`) |
| `requireSelfOrAdmin` | the player themselves, or an admin |

`requireHostAdmin` treats a superadmin as admin everywhere, a global `is_admin` as admin of the **default host only**; other hosts require a `host_admins` row. Guards set `req.player` (and `req.hostId`). It also exports `getDefaultHostId`, `isHostAdmin`, `getCaller`.

Flow:

```
Auth0 (React SDK) → getAccessTokenSilently
  → setupInterceptors (src/api.jsx) → privateApi attaches Bearer token
  → server: checkJwt validates → requireAdmin / requireHostAdmin / requireSelfOrAdmin
  → FE mirrors with Protected*Route (UI gating only — the server guard is the real check)
```

`privateApi` retries once on 401 with a fresh token (`cacheMode: "off"`); **403 is deliberately not retried**. Use `privateApi` for anything behind `checkJwt`, `publicApi` otherwise.

---

## Payments and balances

`payments` rows are the **single source of truth** for `players.account_balance`. An `AFTER INSERT` trigger (`trg_apply_payment`, see `payment_balance_trigger.sql`) applies the signed amount: positive = top-up/refund, negative = match fee/leave penalty/charge.

- **Application code must never `UPDATE account_balance` directly** — insert a payment row instead.
- Duplicate protection is `ON CONFLICT (transaction_id) DO NOTHING`. A suppressed insert does not fire the trigger, so retried webhooks cannot double-credit.
- The **Monzo webhook is inline in `server.cjs`**, not in `Apis/`. It matches `ffc<player_id>` in the transaction notes to attribute a payment, and always responds 200 so Monzo does not retry.
- `Apis/payments/syncPayments.cjs` was the pre-trigger balance sync and would have doubled every unprocessed payment; REPO-003 deleted it. Do not reintroduce that pattern — the trigger owns `account_balance`.

---

## Database

Authoritative schema is the hosted DB (`dump (1).sql` is a dump of it — do not read by default). `all_tables.txt` is an **early snapshot and is stale**: it predates hosts, admin flags, ratings and bans.

| Table | Notes |
|---|---|
| `players` | `player_id` PK, names, `preferred_name`, `year_of_birth`, `email` (unique), `account_balance`, `is_admin`, `is_superadmin` |
| `matches` | `match_id` PK, `match_date`, `match_time`, `price`, `number_of_players`, `pitch_id`, `match_status`, `youtube_links`, `winning_team`, `man_of_the_match`, **`host_id`** |
| `match_players` | PK (`match_id`, `player_id`), `goals`, `assists`, `defcons`, `chancescreated`, `own_goals`, `late`, `price`, `team_id`, `joined_at`, `rating` |
| `match_player_ratings` | `match_id`, `rater_id`, `ratee_id`, `rating` — player-voted ratings |
| `attributes` | `player_id` PK, ~21 numeric skill columns (0–100) |
| `payments` | `payment_id` PK, **`user_id` is the player FK (NOT `player_id`)**, `amount`, `payment_date`, `transaction_id` (unique), `description`, `processed` |
| `pitches` | `pitch_id` PK, `pitch_name`, `address`, `postcode`, price |
| `hosts` | `host_id` PK, `slug` (resolves a portal) |
| `host_admins` | (`host_id`, `player_id`) — per-portal admin rights |
| `bans` | `ban_id` PK, `player_id`, `host_id` (**NULL = global ban**), `banned_until`, `reason`, `ban_type`, `created_by`, `active` |
| `feedback`, `replies` | Present in the old schema snapshot; **no backend code references them** |

`match_status` values used in queries: `pending`, `in_progress`, `completed`, `friendly`. `match_players.team_id` `0` denotes reserves (see `removeReserves` in `matches/queries.cjs`).

**Schema changes go through `farhat_football_app/scripts/migrate.cjs`** (DB-001): `schema.sql` at the repo root is baseline `0000`, and every change after it is a numbered file in `farhat_football_app/migrations/`, recorded in `public.schema_migrations`. Still write re-runnable SQL (`IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP ... IF EXISTS`) and schema-qualify every object, because the baseline leaves `search_path` empty. Applying to production is a human step, after a staging dry run — see `farhat_football_app/SETUP.md`.

---

## Conventions

- **Backend:** CommonJS `.cjs`, `require()` / `module.exports`. The package is `"type": "module"`, so backend files **must** keep the `.cjs` extension.
- **Frontend:** ESM `.jsx`, one folder per page (`src/Pages/<Name>/<Name>.jsx` + `.css`).
- **SQL:** inline template strings in `Apis/**/queries.cjs` with `$1` placeholders; no ORM, no repository layer — controllers call the shared `pool` directly.
- **Formatting:** tabs, applied by hand — no formatter is wired up. ESLint covers `.cjs` as well as `.jsx` since QA-001, but it does not enforce indentation.
- **Config:** `dotenv`; env var names in `.env.example`.

---

## Dependencies to Reuse (already in `package.json`)

`axios`, `express`, `pg`, `express-oauth2-jwt-bearer`, `@auth0/auth0-react`, `date-fns`, `react-router-dom`, `helmet`, `cors`, `dotenv`, `@getbrevo/brevo` / `@sendgrid/mail` (email).

---

## Dead Code — do not extend or copy

| Path | Why |
|---|---|
| `set_first_player_as_admin()` (database function) | Defined in `schema.sql` but **no** `CREATE TRIGGER` references it, so inserting the first player does not make them an admin. Dropping it belongs to `DB-002`. |
| `feedback`, `replies` tables | Present in the old schema snapshot; no backend code references them. |

REPO-003 **deleted** the former entries here — `models/index.js`, `config/config.cjs`,
`Apis/auth/checkAdmin.cjs`, `Apis/payments/syncPayments.cjs`, `src/Pages/UpcomingMatch/`,
`src/Pages/YourPage/` and `randomisermk2.js`. If one reappears, it is a mistake.

**`randomisermk3.js` is NOT dead** — it was listed here in error. `src/Pages/IndividualMatch/IndividualMatch.jsx:7`
imports `randomiserMk3` from it and that page is routed in `App.jsx`, so the live team balancer sits
**outside** the npm package. There is still **no** `Apis/match_players/balancer.cjs`.

Live despite looking dead: `Apis/payments/runFullPaymentSync.cjs` (called by `controller.cjs`) and
`Apis/payments/checkPayments.cjs` (spawned via `exec("node Apis/payments/checkPayments.cjs")`, a
reference no import-grep finds).

---

## Branch workflow

`main` = production (PR-only). `staging` = staging deploy. Branch off `staging` → PR into `staging` → test on staging → PR `staging → main`. Details in `farhat_football_app/SETUP.md`.
