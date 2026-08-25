---
name: repo-navigation
description: >-
  Find your way around the Farhat Football repo and work efficiently in it. Use when orienting in
  an unfamiliar area, deciding which file answers a question, triaging a failing command or stack
  trace, or deciding whether to write new code, reuse an existing helper, or add a dependency.
  Also use before scanning the tree or opening a large file.
---

# Repo navigation and working method

Open only the paths you need. Do not scan the repo tree; do not read a large file end to end.

**Stack:** React 18 + Vite SPA · Express API (CommonJS) · PostgreSQL (`pg`, no ORM) · Auth0 JWT.

**Both tiers live in ONE npm package**, `farhat_football_app/`. The repo root holds only SQL
files, docs and loose scripts — its `package.json` has **no scripts at all**.

## Directories

| Path | Role |
|------|------|
| `farhat_football_app/` | The only npm package — run every command from here |
| `farhat_football_app/Apis/<domain>/` | Backend REST modules, `routes.cjs → controller.cjs → queries.cjs` |
| `farhat_football_app/src/` | React SPA — `Pages/`, `components/`, `context/`, `hooks/` |
| `farhat_football_app/src/Pages/<Name>/` | One folder per page: `<Name>.jsx` + `<Name>.css` |
| `*.sql` at repo root | `schema.sql` is the migration baseline (version `0000`); the other two predate DB-001 |
| `.cursor/` | `REPO_MAP.md` navigation index + `rules/*.mdc` (they apply to Claude too) |

## Entry points

| What | Where |
|------|-------|
| Express app, middleware, route mounting, Monzo webhook | `farhat_football_app/app.cjs` — `createApp()`, no `listen` |
| Process entrypoint (the only thing that listens) | `farhat_football_app/server.cjs` |
| Who the caller is — the one identity resolver | `farhat_football_app/Apis/auth/identity.cjs` |
| React routes, Auth0 interceptor bootstrap | `farhat_football_app/src/App.jsx` |
| Shared `pg` pool — required directly by anything touching the DB | `farhat_football_app/db.cjs` |
| Axios `publicApi` / `privateApi` + JWT interceptor | `farhat_football_app/src/api.jsx` |
| Current portal (`useHost`, `hostPath`) | `farhat_football_app/src/context/HostContext.jsx` |
| Auth guards | `farhat_football_app/Apis/auth/` |

## Which file answers which question

| File | When to open |
|------|--------------|
| `.cursor/REPO_MAP.md` | Full module/route/table index and the **Dead Code** list — start here |
| `farhat_football_app/SETUP.md` | Local setup, dev Auth0 application, branch and deploy workflow |
| `farhat_football_app/.env.example` | Env var names (never open `.env` itself) |
| `farhat_football_app/migrations/0001_reconcile_payment_trigger.sql` | How payments become balances |
| `add_indexes.sql` | Which indexes exist and why |
| `readme.md` (root) | **Stale** — describes a `client/`+`server/`+`database/` layout that does not exist |
| `all_tables.txt` | **Stale** early schema snapshot: pre-hosts, pre-admin-flags, pre-ratings, pre-bans |
| `dump (1).sql` | Authoritative schema, but 1.5 MB — grep, never read |

Domain conventions auto-load as path-scoped rules — [`rules/backend.md`](../../rules/backend.md),
[`rules/frontend.md`](../../rules/frontend.md), [`rules/testing.md`](../../rules/testing.md) —
whenever you open a matching file, so you do not need to fetch them. Schema and payments
reasoning is the `database-changes` skill; environment and tooling traps are `repo-pitfalls`.

## Commands

All from `farhat_football_app/`. **CI runs these on every pull request**
(`.github/workflows/ci.yml`); run them locally first anyway.

| Purpose | Command |
|---|---|
| Unit tests | `npm test` — see `unit-test-engineer` |
| Integration tests (needs Docker) | `npm run test:integration` |
| Both tiers together | `npm run dev` (API :3000 + Vite :5173) |
| API only, with reload | `npm run server` (nodemon — **never in production**) |
| API only, as production runs it | `npm start` (plain `node server.cjs`) |
| Client only | `npm run client` |
| Lint — `**/*.{js,jsx}` **and** `**/*.cjs` | `npm run lint` |
| Production build → `dist/client` | `npm run build` |
| Syntax-check a backend file | `node --check Apis/<domain>/<file>.cjs` |
| Migration state / apply | `npm run migrate:status` / `npm run migrate` |

Lint **does** cover `.cjs` — it has since QA-001, and the baseline is 0 errors / 5 warnings with
warnings capped at 5. An earlier version of this table said otherwise; it was wrong.

Verification is `npm run lint`, `node --check` on any `.cjs` you touched, then exercising the
change through `npm run dev`.

## Working method

**Reuse before writing.** Order: existing project code → a helper already in the repo → a
dependency already in `farhat_football_app/package.json` → small custom code → new dependency
(**ask first**). Already installed and worth reaching for: `axios`, `express`, `pg`,
`express-oauth2-jwt-bearer`, `@auth0/auth0-react`, `date-fns`, `react-router-dom`, `helmet`,
`cors`, `dotenv`, `@getbrevo/brevo` / `@sendgrid/mail`. Do not hand-roll HTTP, validation, date
handling, auth or DB access.

**Check the Dead Code list before extending anything.** Several files look load-bearing and are
not — `models/index.js`, `Apis/auth/checkAdmin.cjs`, `Apis/payments/syncPayments.cjs`,
`src/Pages/UpcomingMatch/`, `src/Pages/YourPage/`. See `repo-pitfalls` and `.cursor/REPO_MAP.md`.

**Triage a failure in this order:** failed command → the first *real* error and its stack trace →
open the cited file and line → minimal fix → smallest verifying command. Never launch a
repo-wide scan off a single failure.

**Minimal diffs.** Change only the functions the task requires. Do not refactor unrelated code,
rewrite whole files, or reformat. A focused 5-line diff beats a 100-line one. This is also a
Cursor rule (`.cursor/rules/code-discipline.mdc`) and applies here.

**No unrequested docs, tests or comments** (`.cursor/rules/docs-and-tests.mdc`). Comments are for
non-obvious business logic or technical constraints only — never narration of what the code does.
