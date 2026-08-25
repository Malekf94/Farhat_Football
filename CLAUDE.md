# CLAUDE.md — Farhat Football

React 18 + Vite SPA · Express API (CommonJS `.cjs`) · PostgreSQL (`pg`, no ORM) · Auth0 JWT.

**Both tiers live in one npm package, `farhat_football_app/`.** Every command runs from there —
it holds the repository's only `package.json` and lockfile, and the repo root has no manifest
at all.

## Load what the task needs

Detail lives one layer down and loads on demand. This file stays small on purpose — do not
restate that content here, and do not import it.

**Rules auto-load** when you touch a matching file. **Skills load on demand** — invoke them.

| Load | When |
|---|---|
| `repo-navigation` skill | Orienting, finding the file that answers a question, triaging a failure, deciding whether to reuse or write new code |
| `repo-pitfalls` skill | **Before running any npm / node / git / PowerShell command, before adding a route, before touching payments or schema** |
| `database-changes` skill | Schema, indexes, triggers, SQL in `queries.cjs`, balances |
| `unit-test-engineer` skill | **Any** work on tests — writing, repairing, reviewing, or judging whether a unit can be tested at all |
| `rules/backend.md` | *(auto, `Apis/**` `server.cjs` `db.cjs`)* structure, route ordering, auth guards, host scoping, payments |
| `rules/frontend.md` | *(auto, `src/**`)* pages, `publicApi`/`privateApi`, host portals, route guards, toolchain gaps |
| `rules/testing.md` | *(auto, `tests/**` `vite.config.js`)* setup, layout, the DB-pool constraint, mock policy |

**What to work on next: `assessment/FARHAT_FOOTBALL_ASSESSMENT.md`** §19–20 for the ordering,
with `assessment/backlog.json` as the canonical ticket set — every ticket carries a `status`
field, so read that before assuming a finding is open. Six of the seven P0 findings are now
fixed; `IR-001`, the review of the historical ledger, is the one still open — it needs production
database access, not code. Phase 2 has since landed `TEST-002`, `AUTH-001` and `SEC-008` on
`zak-dev`; `SEC-005`, `SEC-006`, `SEC-007`, `AUTH-002`, `ARCH-001` and `VAL-001` are the rest of
that phase.

**`assessment/` is deliberately gitignored and exists only in a local working copy.** This
repository is public and the audit is a ranked exploit map for defects still open in production,
so it is shared privately, not committed. If it is absent, ask for it rather than assuming the
findings are closed.

`.cursor/REPO_MAP.md` is the full module/route/table index and carries the **Dead Code** list.
`farhat_football_app/SETUP.md` is the authoritative setup and deploy doc; the root `readme.md`
is the product overview and now agrees with it (REPO-003 corrected its structure, install, env
and run sections).
Dated history of how the traps below were found: [`.claude/discovery-log.md`](.claude/discovery-log.md).

`.cursor/rules/*.mdc` apply to Claude too: minimal diffs, reuse first, no unrequested docs or
tests, narrow reads.

## Core conventions

- Minimal, targeted changes. Change only what the task requires; do not refactor unrelated code,
  rewrite whole files, or reformat.
- Reuse before writing: existing project code → a helper already in the repo → a dependency
  already in `farhat_football_app/package.json` → small custom code → new dependency
  (**ask first**).
- Backend: `routes.cjs → controller.cjs → queries.cjs`, SQL as named template strings with `$1`
  placeholders, one shared `pg` pool.
- Frontend: one folder per page (`src/Pages/<Name>/`), HTTP only through `publicApi` /
  `privateApi` from `src/api.jsx`.
- No unrequested docs, tests or comments. Comments are for non-obvious business logic or
  technical constraints only.
- Ask for missing context rather than guessing.

## Rails — each of these fails silently

Always true. The owning skill or rule carries the explanation and the evidence.

- **CI runs the gates on every PR** (`.github/workflows/ci.yml`, TEST-001) — but still run them
  locally first; a red PR wastes a round trip. All tests live under `farhat_football_app/tests/`,
  never colocated. → `rules/testing.md`
- **`vi.mock()` cannot fake the DB pool inside a `.cjs` module.** The way round it is
  **injection, not mocking**: since TEST-002 every auth guard and `Apis/auth/identity.cjs` export
  a factory taking a pool. Controllers and `queries.cjs` still have no seam and stay
  integration-only. `tests/setup.js` pins `DATABASE_URL` to a dead sentinel, and
  `VITE_AUTH0_AUDIENCE` / `AUTH0_DOMAIN` because `checkJwt` reads them at require time — never
  weaken any of the three. **A fake proves the JavaScript, never the SQL**: a `WHERE` guard or a
  constraint has to be tested against a real database. → `rules/testing.md`
- **Never weaken an assertion, skip a test, or retrofit an expectation to get green.** If a test
  and the implementation disagree, one is wrong, and which is a decision to make explicitly.
  → `rules/testing.md`
- **ESLint now covers `.cjs` and lint is green — keep it that way.** Zero errors is the
  standard, and warnings are capped at 5 by `--max-warnings`. → `repo-pitfalls`
- **Backend files must be `.cjs`**; the package is `"type": "module"`. → `repo-pitfalls`
- **Parameterised routes go last** in every router, and **any new API route must be mounted
  before the `app.get("*")` catch-all** — otherwise it silently serves `index.html`. Routes are
  mounted in `app.cjs` (`createApp()`); `server.cjs` only listens. → `rules/backend.md`
- **Never trust a player id or admin flag from the request body** — guards resolve identity
  through `Apis/auth/identity.cjs` from the token's immutable `sub` claim, then read admin flags
  from the DB. **Never add a lookup by email**: email is mutable and resolving by it is the
  defect AUTH-001 removed. → `rules/backend.md`
- **Frontend `Protected*Route` is UI gating only.** An admin page without a server guard leaves
  the endpoint open. → `rules/backend.md`
- **Never `UPDATE players.account_balance`** — insert a `payments` row and let the trigger apply
  it. `syncPayments.cjs` is disabled and would double balances. → `database-changes`
- **`payments.user_id` is the player FK**, not `player_id`. → `database-changes`
- **Schema changes are numbered migrations now**, applied by `scripts/migrate.cjs` and recorded
  in `public.schema_migrations` — never an edit to an applied file. → `database-changes`
- **Build internal links with `hostPath()`** — a bare path silently drops the user out of the
  active `/h/<slug>` portal and still renders. → `rules/frontend.md`
- **Never read `farhat_football_app/.env`** — real production credentials. Names are in
  `.env.example`. → `repo-pitfalls`
- **`VITE_AUTH0_AUDIENCE` is read by the BACKEND at require time**, despite the `VITE_` prefix.
  Unset, the server dies during module loading and never binds — which a host reports as "no open
  ports detected", not as a missing variable. It was failing the staging deploy. → `repo-pitfalls`
- **Nothing drift-checks this context layer.** Verify a claim in a rule, in a skill, in
  `REPO_MAP.md` or here against the code before relying on it — especially a negative one — and
  promote a new trap into `repo-pitfalls` (with the narrative in `.claude/discovery-log.md`)
  before the session ends, or it is lost. Rules there carry `[V date]` (verified against this
  checkout) or `[I]` (inherited, not re-verified). → `repo-pitfalls`

## Fast gates

Run from `farhat_football_app/`.

```bash
npm test
```

```bash
npm run lint
```

```bash
node --check server.cjs
```

**CI runs all of these on every PR** (`.github/workflows/ci.yml`), so a broken test, lint error,
build failure or unappliable migration blocks the merge. Run them locally anyway — the loop is
seconds and a red PR is a wasted round trip. Since QA-001, `npm run lint` covers the backend too
— all `.cjs` files — and the **baseline is green: 0 errors, 5 warnings**. Compare against zero,
not against the old 17. `node --check` is still a useful fast syntax check but is no longer the
only thing watching a `.cjs` file. `npm run test:integration` needs Docker.

`npm run build` before claiming a change ships. Full command list and the traps in each:
→ `repo-pitfalls`.

## Branch workflow

`main` is production (PR-only). `staging` is the staging deploy. `zak-dev` is the dev line a
sprint's work accumulates on. Branch off `zak-dev` → PR into `zak-dev` → at the end of a sprint
PR `zak-dev → staging` → test there → PR `staging → main`. **Check the base branch on every PR**
— one targeting a feature branch that has already merged lands nowhere shared. Details in
`farhat_football_app/SETUP.md`.
