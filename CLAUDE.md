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
fixed; `IR-001`, the review of the historical ledger, is the one still open.

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

- **There is a Vitest suite (`npm test`) but still no CI.** Nothing runs it but a person, so run
  it yourself. All tests live under `farhat_football_app/tests/`, never colocated.
  → `rules/testing.md`
- **`vi.mock()` cannot fake the DB pool inside a `.cjs` module**, so importing a backend module
  from a test opens a real connection. `tests/setup.js` pins `DATABASE_URL` to a dead sentinel —
  never weaken it. → `rules/testing.md`
- **Never weaken an assertion, skip a test, or retrofit an expectation to get green.** If a test
  and the implementation disagree, one is wrong, and which is a decision to make explicitly.
  → `rules/testing.md`
- **ESLint does not cover `.cjs`** — a green `npm run lint` says nothing about the backend.
  → `repo-pitfalls`
- **Backend files must be `.cjs`**; the package is `"type": "module"`. → `repo-pitfalls`
- **Parameterised routes go last** in every router, and **any new API route must be mounted
  before the `app.get("*")` catch-all** — otherwise it silently serves `index.html`.
  → `rules/backend.md`
- **Never trust a player id or admin flag from the request body** — guards resolve identity from
  the verified token, then read admin flags from the DB. → `rules/backend.md`
- **Frontend `Protected*Route` is UI gating only.** An admin page without a server guard leaves
  the endpoint open. → `rules/backend.md`
- **Never `UPDATE players.account_balance`** — insert a `payments` row and let the trigger apply
  it. `syncPayments.cjs` is disabled and would double balances. → `database-changes`
- **`payments.user_id` is the player FK**, not `player_id`. → `database-changes`
- **No migration tool exists.** Schema changes are hand-written re-runnable `.sql` files at the
  repo root, applied manually. → `database-changes`
- **Build internal links with `hostPath()`** — a bare path silently drops the user out of the
  active `/h/<slug>` portal and still renders. → `rules/frontend.md`
- **Never read `farhat_football_app/.env`** — real production credentials. Names are in
  `.env.example`. → `repo-pitfalls`
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

**There is no CI — nothing runs any of these but a person.** `npm test` is the whole suite and
takes seconds; run it on any change. `npm run lint` covers `**/*.{js,jsx}` **only**, so it says
nothing about a `.cjs` file you touched — syntax-check those by hand with `node --check`. Lint
has a **red baseline of 17 errors and 5 warnings** in unrelated frontend files: compare against
that, not against zero, and do not fix unrelated ones in passing.

`npm run build` before claiming a change ships. Full command list and the traps in each:
→ `repo-pitfalls`.

## Branch workflow

`main` is production (PR-only). `staging` is the staging deploy. `zak-dev` is the dev line a
sprint's work accumulates on. Branch off `zak-dev` → PR into `zak-dev` → at the end of a sprint
PR `zak-dev → staging` → test there → PR `staging → main`. **Check the base branch on every PR**
— one targeting a feature branch that has already merged lands nowhere shared. Details in
`farhat_football_app/SETUP.md`.
