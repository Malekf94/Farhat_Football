# Audit checklist

Phase 4 of [`SKILL.md`](../SKILL.md). Run over every test that touches the unit in question.

The suite is small enough to audit exhaustively. Do that rather than sampling.

## Smells

### Coverage of behaviour

- **Missing behavioural coverage** — a contract line from phase 2 with no test against it. The
  most common real gap: error paths, and the branch that returns early.
- **Tests that execute code without validating an outcome** — calls the unit, asserts nothing, or
  only asserts it did not throw. Reads as coverage, catches nothing.
- **Only the happy path** — no boundary row from the catalogue in
  [`test-matrix.md`](test-matrix.md) is represented.

### Assertion strength

- **Tautology** — the test re-implements the function and compares the two. It will agree with
  any bug.
- **Assertion on the wrong thing** — `toBeDefined()`, `toBeTruthy()`, or a length check where the
  contract is about the values.
- **Over-broad matcher** — `expect.any(Number)` where the contract fixes the number.
- **Snapshot standing in for a contract** — pins the current output including the parts nobody
  decided. Nothing about it says which parts matter.
- **Assertion that cannot fail** — compares a value to itself, or asserts something the type
  system already guarantees.
- **Missing the negative** — asserts the allowed case passes but never that the disallowed case
  is refused. On the authorization path this is the whole test.

### Doubles

- **Mocking the unit under test** — the mock, not the code, is what passes.
- **Mock so detailed it mirrors the implementation** — any refactor breaks it while the behaviour
  is unchanged.
- **Asserting on call order** where the contract is about input and output. Drive a mock by
  input — match on the SQL text or argument — rather than assuming the first call is the one you
  meant.
- **A mock that hides the DB-pool constraint** — a backend test that appears to mock `db.cjs` and
  passes is not doing what it looks like it is doing. Check it against
  [`.claude/rules/testing.md`](../../../rules/testing.md) §The DB-pool constraint before trusting
  it.

### Structure and coupling

- **Test named after the function, not the behaviour.** `it("works")`, `it("computeRadarStats")`.
  An `it` should read as a sentence about behaviour.
- **One test asserting many unrelated behaviours** — the first failure hides the rest.
- **Reaching into internals** the caller has no access to.
- **Setup duplicated across every test** where a helper would say what varies. `RadarChart.test.jsx`
  uses `labels()` and `valueOf()` helpers for exactly this.

### Independence and determinism

- **Order dependence** — passes in a full run, fails alone, or vice versa. Run the file alone to
  check.
- **Leaked module state** — `requireHostAdmin.cjs` memoises the default host id at module scope.
  Anything similar needs `vi.resetModules()` plus a fresh dynamic `import()`.
- **Shared mocks not reset** in `beforeEach`.
- **Real clock, real network, real filesystem** — and above all a real `DATABASE_URL`. Never set
  one in a test.

## Classification

Give every existing test exactly one, with a one-line reason:

| Verdict | Means |
|---|---|
| **keep** | Pins a real behaviour with an assertion that would fail if it broke |
| **strengthen** | Right target, weak assertion or missing boundary. Sharpen in place |
| **replace** | Tests the wrong thing, or tests it through the wrong seam. Rewrite against the contract |
| **delete** | Tautological, unfalsifiable, or duplicates a stronger test. Removing it loses nothing |

## Before deleting or consolidating

- Confirm the behaviour is covered elsewhere, or is on the matrix as a row you are about to
  write. Say which.
- A test that looks redundant may pin a decision rather than a mechanism — the missing-attribute
  case in `computeRadarStats` looks like a duplicate of the averaging test and is not.
- Never delete a test merely because it is failing. A failing test and a wrong implementation
  look identical until you read the contract.
