# Behavioural test matrix

Phases 3 and 5 of [`SKILL.md`](../SKILL.md). Decide what *can* be tested, then write one row per
behaviour that will be.

## What is testable

Driven by the constraint in [`.claude/rules/testing.md`](../../../rules/testing.md) §The DB-pool
constraint: `vi.mock()` cannot intercept a `require()` inside a `.cjs` module, so importing a
backend module that requires `db.cjs` builds a real `pg` Pool.

| Unit | Testable now? |
|---|---|
| Frontend ESM — pure functions, helpers, hooks-free logic | **Yes**, fully, including `vi.mock` |
| Frontend components (rendering) | **No.** Environment is `node`; no jsdom, no Testing Library |
| Backend `.cjs` logic that never touches the pool | Yes — but almost none of it is currently exported |
| Backend `.cjs` that requires `db.cjs` (controllers, guards, queries) | **Not as a unit** — the pool cannot be faked. **Yes as an integration test** against the disposable container (`npm run test:integration`) |

The fourth row is the one that changed. A backend module that requires the pool still cannot be
unit tested, but it **can** now be driven directly against a real disposable PostgreSQL — see
[`.claude/rules/testing.md`](../../../rules/testing.md) §Integration tests against a disposable
database. Reach for that before reaching for an extraction: seeding a container and calling the
guard or controller with a fake `req`/`res` needs **no** change to production code.

Extraction is still the right answer when the logic is genuinely pure and the database is
incidental. **That extraction is a source change on production code — propose it, do not do it
silently.**

`tests/backend/db-guard.test.js` shows the one thing you *can* assert about an unmockable module:
that it loads, and that the pool it built is inert.

## Columns

| Column | Fill with |
|---|---|
| Behaviour | The contract line from phase 2. Cite the backlog ID (`SEC-001`, …) if one covers it; mark it *inferred* if the contract is only implied by the implementation |
| Representative input | The ordinary case a reader would recognise |
| Boundary inputs | From the catalogue below — only the ones actually reachable |
| Expected output | The returned value, precisely. Not "an array" — which array |
| Cost if wrong | Silent auth bypass, double charge, dropped player, cosmetic. This is what orders the work |
| Status | covered / to write / deferred (with reason) / not testable (with reason) |

## Boundary catalogue

Only include a row for a boundary the unit can actually receive.

- **Empty and absent** — `null`, `undefined`, `{}`, `[]`, missing key. Distinguish *missing* from
  *zero*: they are frequently different decisions and only one is usually intended.
- **Type coercion** — a numeric string where a number is expected.
- **Rounding** — exact halves, and which way they go.
- **Ordering** — is the output order part of the contract, or incidental? If it is contract, pin
  it; if it is incidental, do not assert it.
- **Duplicates** — the same id twice, the same transaction twice.
- **Sign** — negative amounts are real on the payment path; a charge is a negative row.
- **Authorization tiers** — superadmin, global admin, host admin, plain player, non-member. The
  three admin tiers are *not* interchangeable and the differences are where the bugs are.
- **Cross-tenant** — the same operation aimed at another `host_id`.

## Repo-specific boundaries worth a row

These have each already produced a real defect or a deliberate decision:

- **`pg` returns `DECIMAL`/`NUMERIC` as strings.** Any helper doing arithmetic on API data must be
  tested with string inputs, not just numbers. `computeRadarStats` has a test pinning this.
- **A missing attribute counts as `0`**, rather than averaging over the keys present. That is a
  decision, not an accident, so it has a test pinning it — do not "fix" it without asking.
- **A global `is_admin` is admin of the default host only.** Superadmin is admin everywhere; any
  other host needs a `host_admins` row. `requireAdmin`'s two tiers are now covered in
  `tests/integration/auth/requireAdmin.test.js`; `requireHostAdmin`'s three are still uncovered
  and remain the highest-value gap.
- **`ON CONFLICT (transaction_id) DO NOTHING` is what makes retried webhooks safe** — a suppressed
  insert does not fire the balance trigger. Duplicate-transaction is a required row on anything
  touching payments.
- **`bans.host_id IS NULL` means a global ban**, not "no host".
