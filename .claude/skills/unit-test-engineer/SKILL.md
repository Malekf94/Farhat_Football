---
name: unit-test-engineer
description: >-
  Vitest unit testing for Farhat Football — audit, design, write, repair, strengthen, refactor or
  review tests, including pre-existing ones. Use when asked to add coverage, assess whether
  existing tests are any good, find what they miss, fix a failing or flaky test, harden weak
  assertions, remove tautological tests, or write a regression test for a bug — and before
  deciding whether a given unit can be unit tested at all, because backend .cjs modules in this
  repo cannot have their database pool mocked. Drives a behaviour-first workflow.
---

# Unit test engineer

One repeatable workflow for raising the **defect-detection power** of this repo's tests. A test
that passes is worth nothing on its own; a test that would fail if the code broke is the
deliverable.

Work the phases in order. Skip a phase only when it is genuinely empty (no pre-existing tests to
audit), and say so.

**Conventions are not in this file.** [`.claude/rules/testing.md`](../../rules/testing.md) holds
the setup, layout, commands, mock policy and naming; this file holds only the procedure.

## 1. Load project context

Read, in this order:

1. [`.claude/rules/testing.md`](../../rules/testing.md) — it may not have auto-loaded yet if you
   have not opened a test file.
2. The [`repo-pitfalls`](../repo-pitfalls/SKILL.md) skill, for the command traps.
3. The rule for the tier you are testing — [`backend.md`](../../rules/backend.md) or
   [`frontend.md`](../../rules/frontend.md).

**Use the commands those files define. Never invent one.** If something you need has no
documented command, say it is unavailable rather than improvising.

## 2. Establish the behavioural contract

Before touching a test, read the production unit, its public interface, its important callers,
the data it moves, its external dependencies, and its existing tests.

Write down what the unit **promises** — one line per behaviour, in terms a caller would
recognise. Include the error paths and the early returns. If a promise is only implied by the
implementation, mark it *inferred*: it may be a bug rather than a contract, and pinning it with a
test makes it permanent.

Cite the backlog ticket ID (`SEC-001`, `EPIC-QUALITY`, …) from `assessment/backlog.json` where one
covers the behaviour.

## 3. Decide whether the unit is testable at all

**Do this before planning any backend test.** `vi.mock()` cannot fake the DB pool inside a `.cjs`
module, which rules out most of `Apis/` — the full matrix and the reasoning are in
[`.claude/rules/testing.md`](../../rules/testing.md) §The DB-pool constraint and
[`references/test-matrix.md`](references/test-matrix.md) §What is testable.

If the unit is not testable as written, say so and stop — then propose the extraction that would
make it testable. **Converting a module to take an injected pool is a source change on production
code on the auth and payment paths. Propose it; do not do it silently.**

## 4. Audit what already exists

Run [`references/audit-checklist.md`](references/audit-checklist.md) over every test that touches
the unit. Classify each existing test as **keep**, **strengthen**, **replace** or **delete**, with
a one-line reason. A test that cannot fail is worse than no test, because it reads as coverage.

## 5. Build the behavioural matrix

One row per behaviour from phase 2, using
[`references/test-matrix.md`](references/test-matrix.md). Fill the boundary columns from the
catalogue there — the string-typed `DECIMAL` case and the missing-attribute case have both
already produced real defects here.

The matrix is what makes the gap visible. Do not skip to writing tests from a mental list.

## 6. Plan

State, before writing code:

- Which rows get a test now, and which are deferred with a reason.
- Which existing tests you are deleting or rewriting, and why.
- Whether anything needs new tooling (`jsdom`, coverage) — if so, flag it as a scope decision
  rather than installing it.

Order by what a wrong answer would cost: the money path, then the authorization path, then
aggregation and ranking, then everything else.

## 7. Implement

Worked patterns for each tier are in
[`references/stack-guidance.md`](references/stack-guidance.md), copied from the tests that already
exist. Follow the conventions in [`.claude/rules/testing.md`](../../rules/testing.md).

## 8. Verify

`npm test` must pass, and `npm run lint` must not gain new problems against the red baseline.
Then **prove the tests can fail**: mutate the unit under test — flip a comparison, drop a
coercion, return early — and confirm the new test goes red. Revert the mutation. A test never
observed failing has not been verified.

Report what you ran and what it said, including anything still red.

## 9. Adversarial review

Re-read your own tests as if trying to sneak a bug past them:

- Which single-character change to the implementation would still pass everything?
- Which assertion restates the implementation rather than the contract?
- Which test would pass if the function returned a cached value from a previous test?
- What did the matrix list that you quietly did not cover?

Fix what this finds, or say plainly what remains uncovered. **Never weaken an assertion to get
green** — [`.claude/rules/testing.md`](../../rules/testing.md) §Never weaken a test.

## 10. Record what you learned

If you hit an environment or tooling trap that generalises, promote it into
[`repo-pitfalls`](../repo-pitfalls/SKILL.md) with a `[V <date>]` tag, and append the dated
narrative to [`.claude/discovery-log.md`](../../discovery-log.md). Otherwise it is lost when the
session ends.
