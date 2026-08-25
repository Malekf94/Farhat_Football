# Discovery log

Dated record of environment-level failures and what they taught. **Not auto-loaded** — it grows
monotonically and is history, not instruction. The durable lessons are promoted into the
[`repo-pitfalls`](skills/repo-pitfalls/SKILL.md) skill and [`rules/`](rules/); this file records
how they were learned.

Read it when an environment problem feels familiar, or before re-litigating a decision made here.

## Append format

Newest at the bottom. One `##` heading per date, one `###` per discovery, each with:

**Issue** — the symptom as it presented, including what it *looked* like.
**Cause** — what was actually true.
**Lesson** — the durable rule, and where it was promoted to.

## The promotion rule

A discovery is not finished until the generalisable part is promoted:

- An operational trap → [`repo-pitfalls`](skills/repo-pitfalls/SKILL.md) with a `[V <date>]` tag.
- A convention bound to a directory → the matching file in [`rules/`](rules/).
- A procedure → the owning skill.

**The narrative stays here; the rule goes there.** Neither file duplicates the other. If you only
write it here it will not load into a future session, and if you only write it there nobody can
tell whether it was ever verified.

**Confidence tags** used in `repo-pitfalls` — **[V]** verified directly against this checkout
(date given); **[I]** inherited, not re-verified.

---

## 2026-08-21

*Reconstructed from `tests/setup.js`, `tests/backend/db-guard.test.js` and the `[V 2026-08-21]`
tags in `repo-pitfalls`. These entries record findings that were verified on that date; the
narrative below is assembled from the artefacts they left behind, not from a contemporaneous log.*

### A backend unit test opened a connection to a real database

Issue:
A test importing a backend module failed with `password authentication failed`. The symptom read
as a credentials problem — a wrong or missing `DATABASE_URL` in the test environment. It was not:
the test had reached a live server.

Cause:
`vi.mock()` cannot intercept a `require()` made inside a `.cjs` module. Mocking `../../db.cjs`
works for a direct ESM `import` and does nothing for the `require("../../db.cjs")` inside
`Apis/auth/requireHostAdmin.cjs`. Mocking `pg` instead fails the same way, and inlining via
`test.server.deps.inline` does not fix it. So importing any backend module from a test builds a
real `pg` Pool from whatever `DATABASE_URL` resolves to — which, via `db.cjs` calling
`dotenv.config()`, is `.env`, which holds production credentials.

The mock did not fail loudly. It silently did nothing, and the pool was real.

Lesson:
`tests/setup.js` now pins `DATABASE_URL` to an unreachable sentinel before any module loads
(dotenv does not override an already-set variable, so this wins over `.env`), and
`tests/backend/db-guard.test.js` pins that guard. Neither may be removed or weakened.

Promoted to [`rules/testing.md`](rules/testing.md) §The DB-pool constraint, and the resulting
testability matrix to
[`skills/unit-test-engineer/references/test-matrix.md`](skills/unit-test-engineer/references/test-matrix.md).
The consequence — most of `Apis/` cannot be unit tested as written — is a structural limit, not a
coverage gap to try harder at.

### ESLint reports green without having read the backend

Issue:
`npm run lint` passing was being treated as evidence that a change touching `Apis/` was clean.

Cause:
`eslint.config.js:10` matches `**/*.{js,jsx}` only. Nothing in `Apis/`, `server.cjs` or `db.cjs`
is linted at all. The lint baseline is also red — 17 errors and 5 warnings pre-exist in unrelated
frontend files — so "no new problems" has to be measured against that baseline, not against zero.

Lesson:
A green lint says nothing about the backend. Syntax-check backend files by hand with
`node --check <file>.cjs`. Promoted to [`repo-pitfalls`](skills/repo-pitfalls/SKILL.md) and
[`rules/frontend.md`](rules/frontend.md) §Toolchain gaps.

---

## 2026-08-24

### Conventions lived in skills, which load on judgement rather than on contact

Issue:
The backend and frontend conventions were `backend-conventions` and `frontend-conventions`
skills. A skill loads only when the model judges it relevant to the prompt — so editing a file
under `Apis/` did not reliably bring the route-ordering and authorization rules into context.
Both of those rules fail *silently* when broken: a route mounted after the `app.get("*")`
catch-all serves `index.html` instead of JSON, and a frontend-only admin guard leaves the
endpoint open. Neither surfaces as an error.

Cause:
Skills and rules are different mechanisms. `.claude/rules/*.md` with `paths:` frontmatter
auto-loads whenever a matching file is read; skills load on relevance judgement. Path-bound
conventions were in the mechanism that does not guarantee delivery.

Lesson:
Split by what the content *is*: conventions bound to a directory become path-scoped rules;
procedures and workflows stay skills. `backend-conventions` and `frontend-conventions` were
converted to [`rules/backend.md`](rules/backend.md) and [`rules/frontend.md`](rules/frontend.md),
and the conventions half of `unit-test-engineer` was split out into
[`rules/testing.md`](rules/testing.md), leaving that skill as procedure only.

`database-changes` deliberately stayed a skill: it is task-bound (schema work, payments
reasoning) rather than path-bound, and its trigger is a question being asked, not a file being
opened.

## 2026-08-24

### The pool constraint was a unit-test limit, not a testability limit

**Issue** — `SEC-004` was planned on the basis that neither changed backend unit could be
tested at all: both require `db.cjs`, `vi.mock()` cannot fake that pool, and the ticket's
"authorization and response-contract tests pass" was written off as blocked on `TEST-002` and
`TEST-003`. A manual staging check was going to stand in for it.

**Cause** — Two separate facts had been collapsed into one. `vi.mock()` genuinely cannot
intercept a `require()` inside a `.cjs` module, so the pool cannot be *faked*. But nothing
stopped the pool being *real*. Once Docker was available, `schema.sql` at the repo root turned
out to be a complete `pg_dump` — 14 tables, 5 functions, 4 triggers including `trg_apply_payment`,
and the `payments_transaction_id_key` unique constraint — so a faithful throwaway database was
one `docker run` away. Guards and controllers can then be called directly with a fake `req`/`res`
and no production code has to move.

**Lesson** — "Not unit testable" is not "not testable". Promoted to
[`repo-pitfalls`](skills/repo-pitfalls/SKILL.md) and to the testability matrix in
[`unit-test-engineer/references/test-matrix.md`](skills/unit-test-engineer/references/test-matrix.md),
whose blanket **No** on pool-bound modules was the negative claim that stopped the search. The
harness itself is documented in [`rules/testing.md`](rules/testing.md).

### schema.sql does not load into the PostgreSQL it was dumped from

**Issue** — Seeding `postgres:16` from `schema.sql` failed on line 11:
`ERROR: unrecognized configuration parameter "transaction_timeout"`.

**Cause** — The dump header (`schema.sql:4-5`) says it came from server 16.13 but was written by
`pg_dump` 17.1, and pg_dump 17 emits `SET transaction_timeout = 0`. PostgreSQL 16 has no such
parameter, so under `ON_ERROR_STOP` the whole load aborts on the first statement that matters.

**Lesson** — The one artefact the repo has for rebuilding a database does not work against the
version production runs, and nothing had exercised it until something tried to restore it. The
harness strips the line at load time rather than editing the tracked dump; fixing the file itself
belongs to `DB-001`. Promoted to [`repo-pitfalls`](skills/repo-pitfalls/SKILL.md), and raised as
a proposed backlog ticket.

### A green webhook test that proved nothing

**Issue** — All 14 tests for `verifyTransaction` passed the first time they were run. Mutation
testing then found that replacing `actual.amount` with `claimed.amount` — reading the credit from
the attacker-supplied notification rather than from the bank — **survived every one of them**.

**Cause** — The amount-mismatch check rejects any event where the two disagree, so by the time the
payment is built they are always equal and no test could distinguish them. The test named "takes
the amount from the bank, not from the notification" was pinning what the code did, not what the
contract said. The gap was real: a notification omitting `amount` skips the mismatch check
entirely, and the mutant then computed `undefined / 100`.

**Lesson** — Tests written after the implementation tend to agree with it, including where it is
wrong. Mutation testing is what catches that, and it has to be run per-guard rather than once over
the file. Added the case that distinguishes the two, and confirmed the mutant now dies. Seven other
mutants died first time; this is the one that did not.

### pg_isready says yes before PostgreSQL is really up

**Issue** — The integration harness intermittently failed to seed, with
`FATAL: the database system is shutting down` part-way through `schema.sql`.

**Cause** — The official `postgres` image runs a temporary server during initdb so that
initialisation scripts can run, then shuts it down and starts the real one. That temporary server
listens on the **unix socket only**. `pg_isready` without `-h` therefore reported ready during
init, and the schema load raced the shutdown that followed.

**Lesson** — Check readiness over TCP, which the initdb-phase server never listens on. Promoted to
[`repo-pitfalls`](skills/repo-pitfalls/SKILL.md). Verified by three consecutive cold-container runs.

## 2026-08-25

### Two commits merged into nothing, and how to see it

**Issue** — SEC-001 and SEC-002, the webhook verification and leave-charge rewrite, showed as
merged in pull request #7. Neither was in `zak-dev`. The unit baseline was also 3 files / 13
tests instead of the documented 4 / 28.

**Cause** — Pull request #7 was based on `fix/ledger-transaction-integrity` and merged seconds
after that branch merged into `zak-dev`. GitHub happily reports "merged" when a pull request's
base branch has already gone; the commits reach the base, which no longer leads anywhere shared.
The missing test file was the visible edge of it — those commits carry three test files.

**Lesson** — "Merged" in the GitHub UI is not evidence a commit is on a shared branch.
`git merge-base --is-ancestor <sha> origin/<branch>` is. A drifted test baseline is a cheap
early warning: if the count does not match what the docs claim, ask which commits are missing
before assuming the doc is stale.

### A blind `catch (err)` rewrite, caught only because lint had just been turned on

**Issue** — Clearing unused `err` bindings for QA-001 with a `sed` over `PaymentsDashboard.jsx`
turned every `catch (err)` into `catch {`. Two of those blocks still call `console.error(err)`.

**Cause** — The linter names the sites where `err` is unused; a global replace does not read the
bodies. The build does not catch it either — an undefined identifier inside a `catch` is a
runtime `ReferenceError`, and only on the error path, which is exactly where nobody looks. The
same mistake then repeated in `ManageHosts.jsx`, where a one-occurrence replace hit the first
site rather than the reported one.

**Lesson** — Fix the sites the linter names, one at a time; never bulk-rewrite a construct whose
correctness depends on the body. `no-undef` caught both, which is only true because QA-001 had
just brought these files under a rule that was already enabled. Promoted to
[`repo-pitfalls`](skills/repo-pitfalls/SKILL.md).

### Mutation testing that says "your test is fine" and means "PostgreSQL has your back"

**Issue** — Verifying the migration runner's tests, two mutations left the suite green: changing
`ROLLBACK` to `COMMIT` on a failed migration, and deleting the `BEGIN` entirely.

**Cause** — Neither is a behaviour change. PostgreSQL turns `COMMIT` on an aborted transaction
into a rollback, and a multi-statement simple query is already wrapped in an implicit
transaction. The explicit `BEGIN` earns its place elsewhere — binding the migration's SQL to its
ledger row, which are separate `query()` calls — and that specific atomicity is not
independently covered.

**Lesson** — A surviving mutant is not automatically a weak test. Ask whether the mutation
changes observable behaviour at all before rewriting the test; sometimes the platform already
guarantees what you were about to assert. Mutations that *did* kill the suite — removing the
checksum drift check, ignoring applied versions, continuing past a failure — are the ones that
prove the tests work.

### A trigger file that was dangerous precisely because it was re-runnable

**Issue** — `payment_balance_trigger.sql` and the live schema both defined
`apply_payment_to_balance()`. The live one writes an audit row to `trigger_log`; the standalone
file did not.

**Cause** — The standalone file used `CREATE OR REPLACE` and documented itself as safe to re-run,
which is normally the right advice here. Applying it to production would have replaced the live
function with the version that writes no audit row. **Balances would have kept working**, so
there would have been no symptom — the ledger would simply have stopped recording what the
trigger did.

**Lesson** — "Safe to re-run" is a claim about idempotency, not about being current. A
re-runnable file holding a stale definition is worse than a one-shot script, because it invites
the re-run that silently reverts. DB-002 deleted it and made
`migrations/0001_reconcile_payment_trigger.sql` canonical, with tests that go red if the audit
write disappears.

### A secret-scanner probe built from an example credential

**Issue** — Verifying gitleaks for SEC-015 with a planted `AKIAIOSFODNN7EXAMPLE` produced no
finding on that file, while reporting three hits in the real local `.env`.

**Cause** — Two things at once. `AKIAIOSFODNN7EXAMPLE` is the published AWS documentation key and
gitleaks allowlists it by design. And `gitleaks dir` reads gitignored files, so it scans the real
`.env` every time.

**Lesson** — A probe built from example credentials proves nothing, and would have been read as
"the scanner works". Use realistic values. Use `git` mode in CI, not `dir`: `dir` mode's constant
`.env` findings on developer machines are exactly how a scanner gets ignored.

### A version bump whose breakage only appears on the *next* install

**Issue** — `npm install vite@^8 vitest@^4` succeeded and every gate passed. The following
`npm install react-router-dom@^7` failed with `ERESOLVE`.

**Cause** — `@vitejs/plugin-react@4.7.0` peers on `vite ^4 || ^5 || ^6 || ^7`. Installing vite 8
left that peer unsatisfied, but npm reported nothing at the time; the conflict only surfaces when
the tree is next resolved.

**Lesson** — After a major bump of a build-toolchain package, run a throwaway `npm install` to
force a re-resolve rather than trusting the bump's own silence. Promoted to
[`repo-pitfalls`](skills/repo-pitfalls/SKILL.md).

### Documenting a shell behaviour without running it

**Issue** — The DX-001 draft of `SETUP.md` stated that `DATABASE_URL=... npm run …` is a parse
error in PowerShell.

**Cause** — It is not. PowerShell parses it without complaint and fails at execution with
`CommandNotFoundException`, having read the whole assignment as a command name.

**Lesson** — Plausible is not verified, and a cross-platform claim is exactly the kind a reader
cannot check cheaply. Both shells were then tested directly — including validating `Copy-Item`
against a temp target rather than `.env`, which holds live credentials and would have been
overwritten by the documented command.

## 2026-08-26

### A deploy that failed for 90 seconds of silence, and the variable nobody would suspect

**Issue** — Render's staging deploy was red. The log said only:

```
running node server.cjs
Port scan timeout reached, no open ports detected
```

The failure was attributed to the most recent merge, PR #5 (SEC-003, roster mutation identity),
because that was the change that preceded it.

**Cause** — `Apis/auth/checkJwt.cjs:3` builds its Auth0 verifier at **require** time. With
`VITE_AUTH0_AUDIENCE` unset, `express-oauth2-jwt-bearer` throws
`AssertionError: An 'audience' is required to validate the 'aud' claim` while modules are still
loading, so the process starts, dies before `app.listen`, and Render's port scan simply times
out. Nothing in the message mentions an environment variable.

**How it was settled** — Not by reading the code, which supports either story, but by booting
three commits with only that variable absent and everything else present: `origin/staging`, the
commit *before* PR #5, and `origin/main` all failed identically. A crash reproducible on `main`
cannot have been introduced by a branch merged after it. Separately, the staging tree passed
`npm ci`, `npm test` and `npm run build` and booted fine once the variable was supplied.

**Why it was easy to blame the wrong thing** — the correlation was real (the deploy did fail
after that merge) and the guard PR #5 added genuinely does tighten authorization, so a
plausible story was available. It was also the only recent change. Timing plus plausibility is
not evidence, and the cheap experiment — vary one input, hold the rest — separated them in
about a minute.

**Lesson** — `VITE_AUTH0_AUDIENCE` is the only `VITE_`-prefixed variable the **backend** reads
at runtime, and the only variable in the whole set whose absence stops the port opening. Its
prefix actively misleads: anyone provisioning a service treats `VITE_*` as frontend build config
and drops it, or "corrects" it to `AUTH0_AUDIENCE`. `.env.example` said as much — "these four
are read by the frontend" — and has been corrected, because a wrong negative claim is the kind
that stops you looking. Promoted to [`repo-pitfalls`](skills/repo-pitfalls/SKILL.md).

### dotenv was being loaded by the wrong file, and it happened to work

**Issue** — While extracting `app.cjs` for TEST-002, the require order in `server.cjs` looked
wrong: `checkJwt.cjs` was required on line 18, and `require("dotenv").config()` ran on line 19.
Since `checkJwt` reads `VITE_AUTH0_AUDIENCE` at require time, that should never have worked.

**Cause** — It worked because `db.cjs:2` also calls `dotenv.config()`, and `db.cjs` is pulled in
transitively by the first route require on line 5 — thirteen lines earlier. The environment was
always loaded by the time line 18 ran, so the call on line 19 was dead code and the ordering was
accidental. Verified both ways: with a dummy `.env` and no shell environment the server starts;
with neither it crashes at `checkJwt.cjs:3`.

**Lesson** — Reordering those requires, or removing dotenv from `db.cjs`, would have broken JWT
validation at boot with nothing to catch it. `app.cjs` now loads dotenv on its first line, above
every require, so the ordering is stated rather than inherited.

### A mutation that says "your test is fine" and means "the fake is doing the work"

**Issue** — Deleting `AND auth0_sub IS NULL` from the identity claim in `identity.cjs` left all
18 unit tests for that module green. That clause is the entire race-safety property: two
concurrent first requests both read a row as unclaimed, and only one `UPDATE` may bind it.

**Cause** — The fake pool's claim handler applied the condition itself, so removing it from the
SQL changed nothing the fake did. The test was exercising the fake's logic, not the module's.

**Lesson** — A fake can only prove the JavaScript around a query. Anything a query enforces —
a `WHERE` guard, a unique index, `ON CONFLICT`, a constraint — has to be driven against a real
database, and the case now lives in `tests/integration/auth/identity.test.js`, where restoring
the mutation reddens two tests. This is the second time mutation testing in this repo has found
that the interesting behaviour lives in PostgreSQL rather than in the module under test.
Promoted to [`repo-pitfalls`](skills/repo-pitfalls/SKILL.md).

### An endpoint behind a guard that its only caller could not satisfy

**Issue** — While removing the caller-supplied email from `/players/check` (SEC-008),
`LoginPage.jsx` turned out to call it through the bare `axios` default instance rather than
`privateApi`.

**Cause** — The route is mounted with `checkJwt`, so a request without a bearer token is
rejected. The bare instance attaches none, and also uses a relative URL that depends on the Vite
proxy the documented setup bypasses. The call therefore always failed, and the page's catch block
turned that into "An error occurred. Please try again." — on the screen whose entire job is
deciding whether to send a new user to signup.

**Lesson** — It was already broken before this sprint touched it, and nothing surfaced it,
because a guard rejecting an unauthenticated call looks exactly like a guard working. The
frontend rule already says every call behind `checkJwt` goes through `privateApi`; what was
missing was anything that would notice the rule being broken. Worth remembering when auditing
callers: grep for `axios.` in `src/` and check each hit against the route's guards.

### MSYS path conversion makes a real branch look missing

**Issue** — `git show origin/staging:.nvmrc` failed with
`fatal: ambiguous argument 'origin\staging;.nvmrc': unknown revision or path not in the working
tree`, which reads as though the branch does not exist.

**Cause** — Git Bash on Windows rewrites arguments that look like POSIX paths. `origin/staging:.nvmrc`
was mangled into `origin\staging;.nvmrc` before git ever saw it.

**Lesson** — Export `MSYS_NO_PATHCONV=1` before any git command carrying a `rev:path` argument.
The error names the revision, not the quoting, so it sends you looking for a missing branch.
Promoted to [`repo-pitfalls`](skills/repo-pitfalls/SKILL.md).
