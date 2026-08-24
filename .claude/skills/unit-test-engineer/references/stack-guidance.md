# Stack guidance

Phase 7 of [`SKILL.md`](../SKILL.md) — how to *write* each kind of test here. Conventions and
commands are in [`.claude/rules/testing.md`](../../../rules/testing.md); this file is the worked
patterns, copied from the two tests that already exist.

## Frontend — pure logic

`tests/frontend/components/RadarChart.test.jsx` is the model. The pattern:

- **Export the pure function separately from the component.** `computeRadarStats` is exported
  from `RadarChart.jsx` alongside the default component export, which is what makes it testable
  in a `node` environment with no jsdom. Do the same when adding logic to a component.
- **Import explicitly** — `import { describe, it, expect } from "vitest";`. Globals are off.
- **Give the assertions a vocabulary.** Small helpers at the top of the file say what varies:

  ```js
  const labels = (stats) => stats.map((s) => s.label);
  const valueOf = (stats, label) => stats.find((s) => s.label === label).value;
  ```

  Every `it` then reads as one behaviour, not as list-index arithmetic.
- **One behaviour per `it`, named as a sentence** — `it("rounds halves upward")`,
  `it("returns null when there are no attributes")`.
- **Assert the value, not its shape.** `toBe(11)`, not `toBeDefined()`.
- **Comment only the non-obvious.** The `pg`-returns-strings comment earns its place because
  nothing in the test file explains why `"12"` is a realistic input; the rounding test needs no
  comment.

Order of behaviours in the file: absent input → fixed structure → the ordinary case → boundaries.

## Frontend — components

**Not testable.** The environment is `node`, with no jsdom and no Testing Library. Do not write a
rendering test that skips, and do not install the tooling as a side effect of a test task — flag
it in phase 6 as a scope decision. → [`.claude/rules/testing.md`](../../../rules/testing.md)
§Growing the setup.

## Backend — the import boundary

Backend tests are `.js` (ESM) importing a `.cjs` subject. That crossing needs the interop dance:

```js
const mod = await import("../../Apis/auth/requireHostAdmin.cjs");
const { isHostAdmin } = mod.default ?? mod;
```

Use a **dynamic** `import()` inside the test, not a top-level static one, whenever the module
memoises anything at module scope — pair it with `vi.resetModules()` so each test gets a fresh
copy. `requireHostAdmin.cjs` memoises the default host id and will otherwise leak between tests.

## Backend — what you can assert about an unmockable module

`tests/backend/db-guard.test.js` is the model for the narrow thing that *is* available. It proves
two separate facts:

1. The setup guard is in place — `DATABASE_URL` is the blocked sentinel.
2. A module that requires the pool **loads**, and the pool it built is **inert**:

   ```js
   // A superadmin short-circuits before any query, so this proves the module loads;
   // the rejection below proves the pool it built is inert.
   await expect(isHostAdmin({ player_id: 1, is_superadmin: true }, 99)).resolves.toBe(true);
   await expect(isHostAdmin({ player_id: 1, is_admin: true }, 99)).rejects.toThrow();
   ```

The trick generalises: **a code path that short-circuits before the first query is testable even
in a module that requires the pool.** Superadmin checks, argument validation, and early returns
all qualify. Anything that reaches `pool.query` does not — it will reject, and a test asserting
the rejection is testing the guard, not the logic.

Do not build on this to fake wider coverage. If the behaviour you want needs a query, the unit is
not testable as written; go back to phase 3.

## Backend — making a unit testable

Extract the pure decision out of the module that requires the pool, into one that does not, and
test the extracted function directly. The host-admin tier rules — superadmin everywhere, global
`is_admin` on the default host only, `host_admins` otherwise — are the highest-value candidate.

**This is a source change on production code on the auth path. Propose it and get agreement
before writing it.** Then the new module is plain ESM-importable logic and the first section of
this file applies.

## Mocks

- Reset in `beforeEach` with `vi.fn()` + `mockReset()`, never between assertions.
- Match on input — the SQL text, the argument — rather than call order.
- `vi.mock()` works normally for a direct ESM `import`. It does **nothing** for a `require()`
  inside a `.cjs` module. If a backend test seems to be mocking `db.cjs` successfully, re-read it:
  it is not.
