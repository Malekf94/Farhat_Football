---
paths:
  - "farhat_football_app/tests/**/*"
  - "farhat_football_app/vite.config.js"
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
| Included | `tests/**/*.test.{js,jsx}` |
| Environment | `node` — there is **no jsdom and no Testing Library** |

Commands, from `farhat_football_app/`:

| Purpose | Command |
|---|---|
| Full suite | `npm test` |
| Watch | `npm run test:watch` |
| One file | `npx vitest run tests/frontend/components/RadarChart.test.jsx` |
| One test | `npx vitest run -t "rounds halves upward"` |

**There is no CI.** Nothing runs `npm test` but a person, so run it yourself before claiming a
change is verified.

## Layout

All tests live in one tree under `farhat_football_app/tests/`, mirroring the source beneath a
tier folder. Tests are **not** colocated with their subject, and there are no `__tests__`
directories.

```
tests/
├── setup.js                                  # runs before every test file
├── backend/                                  # mirrors Apis/
│   └── db-guard.test.js
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
- **Coverage** needs `@vitest/coverage-v8`. There is no threshold and no CI to enforce one, so
  treat coverage as diagnostic.
- **CI** is the single highest-value follow-up, because an unrun suite rots
  (`EPIC-QUALITY` in the backlog).

## Verifying your change

`npm test` must pass, and `npm run lint` must not gain new problems against the **red baseline**
of 17 errors and 5 warnings ([`frontend.md`](frontend.md) §Toolchain gaps). Everything under
`tests/` gets Node globals from a dedicated block in `eslint.config.js`.
