---
paths:
  - "farhat_football_app/tests/**/*"
  - "farhat_football_app/vite.config.js"
  - "farhat_football_app/vitest.integration.config.js"
---

# Testing rules

Loaded when reading or editing a test. **Conventions only** — the audit/design/rework *workflow*
is the [`unit-test-engineer`](../skills/unit-test-engineer/SKILL.md) skill; general execution
traps are the [`repo-pitfalls`](../skills/repo-pitfalls/SKILL.md) skill.

The suite is **new and small**. It exists to be grown; treat gaps as work to do, not as evidence
that something is untestable — except for the one structural limit below, which is real.

## Setup as it actually is

| Thing | Where |
|---|---|
| Runner | Vitest 2.1.9 (`devDependencies`) |
| Config | the `test` block in `farhat_football_app/vite.config.js` — **not** a separate `vitest.config.js` |
| Setup file | `farhat_football_app/tests/setup.js` |
| Included | `tests/frontend/**` and `tests/backend/**` only |
| Environment | `node` — there is **no jsdom and no Testing Library** |
| Integration config | `farhat_football_app/vitest.integration.config.js` — separate on purpose, see below |

Commands, from `farhat_football_app/`:

| Purpose | Command |
|---|---|
| Full suite | `npm test` |
| Watch | `npm run test:watch` |
| One file | `npx vitest run tests/frontend/components/RadarChart.test.jsx` |
| One test | `npx vitest run -t "rounds halves upward"` |
| Integration suite | `npm run test:integration` (needs Docker) |

**CI runs both suites on every pull request** (`.github/workflows/ci.yml`, TEST-001): lint,
backend syntax, `npm test`, `npm run build`, and `npm run test:integration` including migration
validation. Run them locally first anyway - the loop is seconds and a red pull request is a
wasted round trip.

## Layout

All tests live in one tree under `farhat_football_app/tests/`, mirroring the source beneath a
tier folder. Tests are **not** colocated with their subject, and there are no `__tests__`
directories.

```
tests/
├── setup.js                                  # runs before every test file
├── backend/                                  # mirrors Apis/
│   ├── auth/
│   │   └── requireAdmin.test.js
│   └── db-guard.test.js
├── integration/                              # needs Docker; own config
│   ├── global-setup.js                       # container lifecycle
│   ├── setup.js                              # live DATABASE_URL
│   ├── helpers/seed.js
│   ├── auth/requireAdmin.test.js
│   └── payments/paymentDashboard.test.js
└── frontend/                                 # mirrors src/
    └── components/
        └── RadarChart.test.jsx
```

A test for `src/<path>/<Name>.jsx` goes to `tests/frontend/<path>/<Name>.test.jsx`; a test for
`Apis/<domain>/<file>.cjs` goes to `tests/backend/<domain>/<file>.test.js`. Create the mirroring
subfolder rather than flattening. Backend tests are `.js` (ESM) even though their subject is
`.cjs` — they import it across the boundary.

Import `describe`/`it`/`expect`/`vi` explicitly — globals are not enabled.

## The DB-pool constraint

**`vi.mock()` cannot intercept a `require()` made inside a `.cjs` module.** Verified directly:
mocking `../../db.cjs` works for a direct ESM `import`, and does nothing for the
`require("../../db.cjs")` inside `Apis/auth/requireHostAdmin.cjs`. Mocking `pg` instead fails the
same way. Inlining via `test.server.deps.inline` does not fix it.

The consequence is not a failing mock — it is that **importing a backend module from a test
builds a real `pg` Pool from `DATABASE_URL` and opens a real connection.** Before the guard
existed, a backend test reached a live server and got `password authentication failed`.

`tests/setup.js` therefore pins `DATABASE_URL` to an unreachable sentinel before any module
loads (dotenv does not override an already-set variable, so this wins over `.env`).
`tests/backend/db-guard.test.js` pins that guard. **Do not remove or weaken either**, and never
set a real `DATABASE_URL` in a test.

What this rules in and out is the testability matrix in
[`references/test-matrix.md`](../skills/unit-test-engineer/references/test-matrix.md).

## Integration tests against a disposable database

The pool constraint above is a limit on *unit* tests. Anything that needs the real database —
the admin tiers, a trigger, an `ON CONFLICT`, a transaction rolling back — is covered by a
second suite that runs against a throwaway PostgreSQL container.

| Piece | What it does |
|---|---|
| `vitest.integration.config.js` | Own config. `npm test` never loads it |
| `tests/integration/global-setup.js` | Creates, seeds and destroys the container |
| `tests/integration/setup.js` | Points `DATABASE_URL` at that container |
| `tests/integration/helpers/seed.js` | Shared pool, `resetDatabase()`, row builders |

Run it with `npm run test:integration`. It needs a running Docker daemon and nothing else — no
new dependency, and no local PostgreSQL.

**The two suites are separate so the unit guard can stay absolute.** `tests/setup.js` pins
`DATABASE_URL` to a dead sentinel for everything under `tests/backend` and `tests/frontend`;
integration tests need the opposite, and get it only through their own config. Never merge the
two, never point the unit suite at a live database, and never relax `db-guard.test.js`.

Details that bite:

- The container is provisioned by the **migration runner** (`scripts/migrate.cjs`, DB-001), not
  by piping the dump into `psql`. It applies the repo-root **`schema.sql`** baseline — a real
  `pg_dump` of production, triggers, sequences and the `payments_transaction_id_key` unique
  constraint included — then every migration. So each run asserts that provisioning from tracked
  files actually works, and a migration that breaks it fails the suite rather than production.
- DB-001 removed the `SET transaction_timeout` that `pg_dump` 17 emits and PostgreSQL 16
  rejects, so the dump now loads unedited and the harness no longer filters anything. If someone
  regenerates `schema.sql` with `pg_dump` 17, provisioning fails here loudly — that is intended.
- `tests/integration/migrations/migrate.test.js` covers the runner itself. Each case builds its
  **own scratch database** in the same container and drops it afterwards, because those tests
  provision from empty and `resetDatabase()` cannot undo that. Do not point them at `ff_test`.
- The image is pinned to `postgres:16` to match production. Do not bump it casually — trigger
  and locking behaviour is exactly what these tests assert.
- Docker picks the host port, so a local PostgreSQL on 5432 is never in the way.
- `fileParallelism` is off: one database, shared state. Call `resetDatabase()` in `beforeEach`
  rather than assuming a clean table.
- `set_first_player_as_admin()` exists in the schema but **no trigger uses it**, so a seeded
  player does not silently become an admin. Verified against the dump.

## Conventions

- One `describe` per exported unit; `it` names read as sentences about behaviour.
- Reset shared mocks in `beforeEach` (`vi.fn()` + `mockReset()`), not between assertions.
- Module-level caches leak across tests. `requireHostAdmin.cjs` memoises the default host id at
  module scope — anything similar needs `vi.resetModules()` plus a fresh dynamic `import()`.
- Drive a mock by input, not call order, where you can — match on the SQL text or argument rather
  than assuming the first call is the one you meant.
- Import a CJS module as `const mod = await import("./x.cjs"); const { fn } = mod.default ?? mod;`
- **`pg` returns `DECIMAL`/`NUMERIC` columns as strings**, so any helper doing arithmetic on API
  data must be tested with string inputs, not just numbers.

## Never weaken a test to get green

If a test and the implementation disagree, one of them is wrong, and which one is a decision to
make explicitly and say out loud. Do not relax an assertion, skip a case, or retrofit an
expectation to the current output. Do not add a test that only asserts a function returns
something, or that re-implements the function to compare against itself.

## Growing the setup

Add tooling only when a test genuinely needs it, and update this file in the same change:

- **Component rendering** needs `jsdom` and `@testing-library/react`, neither installed. Install
  both and set `environment: "jsdom"` for those files via `test.environmentMatchGlobs`.
- **Coverage** needs `@vitest/coverage-v8`. No threshold is set, so treat coverage as
  diagnostic; adding one is a scope decision, and CI is now there to enforce it if you do.
- **CI** is the single highest-value follow-up, because an unrun suite rots
  (`EPIC-QUALITY` in the backlog). It must run both suites — `npm test` and
  `npm run test:integration` — or the integration ones rot fastest.

## Verifying your change

`npm test` must pass, `npm run test:integration` must pass if you touched anything it covers,
and `npm run lint` must stay green — since QA-001 the baseline is **0 errors and 5 warnings**,
and the lint script caps warnings at 5 ([`frontend.md`](frontend.md) §Toolchain gaps). Everything under
`tests/` gets Node globals from a dedicated block in `eslint.config.js`.
