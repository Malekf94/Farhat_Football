# Farhat Football — developer setup

## Prerequisites
- **Node.js 20 or newer** — pinned in `.nvmrc` and enforced by `engines`. CI runs 20.x, so that
  is the version to match if you hit anything version-shaped. With nvm: `nvm use` from the repo
  root.
- **PostgreSQL** — a local instance, or a connection string for a database you own.
- **Docker** — only for `npm run test:integration`, which creates and destroys its own
  container. Not needed for anything else.

You do **not** need any production credential to set this up. Everything below runs against
your own database and your own dev Auth0 application.

## The install root
`farhat_football_app/` is the **only** npm package in this repository. Both tiers — the
React frontend and the Express API — install, build, test and deploy from there, and it
holds the only `package.json` and `package-lock.json`. There is deliberately no manifest at
the repo root: every `npm` command below assumes `farhat_football_app/` is the working
directory, and the hosting build command must `cd` there before installing.

### What the host must run

The server serves the built SPA from `dist/client`, which is gitignored, so the host builds it.

| Step | Command | Note |
|---|---|---|
| Install | `npm ci` | **Must include devDependencies.** `vite` is a devDependency (DEP-002), so an install that omits them cannot build. If the platform sets `NODE_ENV=production`, pass `npm ci --include=dev` |
| Build | `npm run build` | Produces `dist/client` |
| Migrate | `npm run migrate` | Only after the one-time baseline adoption — see below |
| Start | `npm start` | Plain `node server.cjs`. Do **not** use `npm run server` in production: that is `nodemon`, a devDependency |

## Run it locally

Commands are given for **bash/zsh** (macOS, Linux, Git Bash) and **PowerShell** (Windows) where
the two differ. Every `npm` command runs from `farhat_football_app/`.

1. Clone and install. Use `npm ci`, not `npm install` — it installs exactly the lockfile and
   fails if the lockfile and `package.json` disagree, instead of quietly resolving something
   new:

   ```bash
   git clone https://github.com/Malekf94/Farhat_Football.git
   cd Farhat_Football/farhat_football_app
   npm ci
   ```

2. Create your env file from the template:

   bash / zsh:
   ```bash
   cp .env.example .env
   ```
   PowerShell:
   ```powershell
   Copy-Item .env.example .env
   ```

   Fill it with **your own dev values** — your own database, and a **dev Auth0 application**
   (see below). Leave the Monzo and Brevo secrets blank; payments and emails simply won't fire
   locally, which is fine for development.

3. Create an empty database, then provision it from the tracked baseline and migrations.
   Substitute your own superuser connection string if `postgres://localhost/postgres` is not
   how you reach your instance:

   ```bash
   psql "postgres://localhost/postgres" -c "CREATE DATABASE farhat_football_dev"
   ```

   Point `DATABASE_URL` in `.env` at that database, then:

   ```bash
   npm run migrate:provision
   ```

   That applies the `schema.sql` baseline and every migration on top of it, and records them in
   `schema_migrations`. Check it with `npm run migrate:status`. See *Database schema and
   migrations* below.

   > `migrate:provision` reads `DATABASE_URL` from your `.env`. To target a different database
   > for one command without editing `.env`, pass `--url`:
   > `node scripts/migrate.cjs status --url "postgres://..."`. That works identically in both
   > shells, which the bash inline-variable form `DATABASE_URL=... npm run …` does not —
   > PowerShell parses it happily and then fails at execution with
   > `CommandNotFoundException: The term 'DATABASE_URL=...' is not recognized`, because it reads
   > the whole assignment as a command name. In PowerShell set it on its own line first:
   > `$env:DATABASE_URL = "postgres://..."`.
4. Start both the API and the frontend together:
   ```bash
   npm run dev
   ```
   - Frontend: http://localhost:5173
   - API: http://localhost:3000

## Database schema and migrations

Schema changes used to be hand-written `.sql` files applied by hand, with no record of what had
already been run. They are now versioned and recorded.

- **Baseline** — `schema.sql` at the repo root, a `pg_dump` of production. This is version
  `0000`, the starting point every environment shares.
- **Migrations** — `farhat_football_app/migrations/NNNN_name.sql`, applied in ascending order,
  each inside one transaction.
- **Ledger** — `public.schema_migrations` records the version, name, checksum and time of every
  applied migration, so what a database has had done to it is a query, not a memory.

Run everything from `farhat_football_app/` with `DATABASE_URL` pointing at the target.

| Command | Use it when |
|---|---|
| `npm run migrate:status` | Always safe. Shows applied versions, what is pending and any drift |
| `npm run migrate:provision` | The database is **empty** — applies the baseline, then all migrations |
| `npm run migrate:baseline` | The database **already matches** `schema.sql` but has never been recorded. Stamps `0000` without applying anything |
| `npm run migrate` | Applies pending migrations to an already-baselined database |

### Adopting the production database (one time)

Production predates this runner: its schema is already in place and nothing is recorded. Adopt
it once, then use `npm run migrate` from then on.

1. Take a backup first. This is the one step that is hard to undo.
2. Confirm the live schema matches `schema.sql`. Regenerate with `pg_dump --schema-only` from
   production and diff it; reconcile any difference **before** stamping, because the stamp
   asserts they agree.
3. `npm run migrate:baseline` — records `0000` and applies nothing.
4. `npm run migrate:status` — confirm `Baseline stamped : true`.

### Resetting a local database

There used to be a `querydata` file at the repo root — no extension, no warning, tracked in a
public repository — that disabled every trigger, truncated every table in `public` and restarted
identities. Pasted at the wrong prompt it would have destroyed the ledger, and nothing about its
name suggested that. REPO-002 deleted it (it is recoverable from history if ever needed).

To start clean locally, drop and recreate the database and provision it again — that way the
reset is scoped to a database you named, not to whatever `DATABASE_URL` happens to point at:

```bash
psql "postgres://localhost/postgres" -c 'DROP DATABASE farhat_football_dev'
psql "postgres://localhost/postgres" -c 'CREATE DATABASE farhat_football_dev'
npm run migrate:provision
```

Integration tests need none of this — they build and destroy their own container per run.

### Adding a schema change

1. Write `migrations/NNNN_short_description.sql`. Conventions and the rollback stance are in
   [`migrations/README.md`](migrations/README.md).
2. Apply it locally with `npm run migrate`, and run `npm run test:integration` — that suite
   provisions a throwaway PostgreSQL **through this runner**, so a migration that breaks
   provisioning fails the tests.
3. **Dry-run on staging before production.** Deploy the branch to staging, run
   `npm run migrate:status`, then `npm run migrate`, and exercise the affected pages. Staging
   and production share the same baseline, so a migration that applies cleanly on staging is
   the only evidence worth having.
4. Apply to production with `npm run migrate`, then `npm run migrate:status` to confirm.

An applied migration is immutable — the runner stores a checksum and refuses to continue if the
file has changed since. Fix a mistake with a new migration.

**Regenerate `schema.sql` with `pg_dump` 16.x**, matching the server major. `pg_dump` 17 emits
`SET transaction_timeout = 0`, which PostgreSQL 16 rejects, and that aborts the whole load.

## Git hooks: there are none, deliberately

This project runs **no git hooks**. Nothing is installed on commit, and a fresh clone needs no
hook setup — the gates live in CI (`.github/workflows/ci.yml`), which is the one place they
cannot be skipped with `--no-verify`.

A `.husky/` directory used to sit in working copies containing only husky's runtime shims: no
hook definitions, no `husky` dependency in the manifest, no `prepare` script, and untracked, so
it was never in the repository at all. It made `core.hooksPath` point at scaffolding that did
nothing, which reads as protection that is not there. QA-002 removed it.

If you have an older clone, clear the leftover:

```bash
git config --unset core.hooksPath && rm -rf .husky
```

Run the gates yourself before pushing — `npm run lint` and `npm test` take seconds together:

```bash
cd farhat_football_app && npm run lint && npm test
```

Reinstating hooks would mean adding `husky` as a devDependency plus a `prepare` script, so that
a fresh clone reproduces them. That is a deliberate decision to take, not something to leave
half-done in a working copy.

## Auth0 for local development
Log-in won't work locally until Auth0 allows localhost. Use a **separate dev
Auth0 application** (don't loosen the production one), and add to its settings:
- Allowed Callback URLs: `http://localhost:5173`
- Allowed Logout URLs: `http://localhost:5173`
- Allowed Web Origins: `http://localhost:5173`

Put that dev app's domain / client id / audience into your `.env`. The Login
Action that adds the email custom claim must be enabled on the tenant you use.

## Branch & deploy workflow
- **`main`** → production (protected: changes only via pull request).
- **`staging`** → a staging deploy for testing before it goes live.
- **`zak-dev`** → the dev line a sprint's work accumulates on.

Flow for any change:
1. Branch off `zak-dev`: `git checkout zak-dev && git pull && git checkout -b my-feature`
2. Open a PR into **`zak-dev`**.
3. At the end of a sprint, open a PR from **`zak-dev` → `staging`**. Merging it auto-deploys to
   the staging site.
4. Test on staging.
5. Open a PR from **`staging` → `main`**. Merging it deploys to production.

Check the base branch before opening a PR. A PR based on another feature branch is fine while
that branch is still open, but once the base merges, the PR's own work reaches no shared branch
— it stays on the feature branch and needs a fresh PR into `zak-dev`.

## Never commit secrets
`.env` is gitignored. Production credentials (the real database URL, Monzo
token, Brevo key, Auth0 client secret) stay with the owner and are set as
environment variables in the hosting dashboard — never in the repo.

**This repository is public**, so a committed credential is disclosed the moment it is pushed,
and deleting it later does not undo that — the object stays reachable in the history and in
every clone and fork. CI runs `gitleaks` over the committed history on every pull request
(SEC-015) and fails on a hit, but that is a net, not a guarantee: treat `.env` as radioactive.

**Baseline scan:** the full history was scanned on 2026-08-25 — 289 commits, ~24 MB — and
**no leaks were found**. That is the clean state the CI job protects. Re-run it after any
history rewrite:

```bash
docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:v8.30.1 git /repo --redact --no-banner
```

Scan the working tree with `dir` instead of `git`, and expect it to report your local `.env` —
`dir` mode reads gitignored files. That is why CI uses `git` mode.

### If a credential is exposed

Rotate first, then clean up. Rotation is what ends the exposure; removing the commit is
housekeeping. Assume anything pushed to a public repository was scraped within minutes.

| Secret | Where it is rotated | Owner | Notes |
|---|---|---|---|
| `DATABASE_URL` | Hosting provider's database dashboard — reset the password, then update the variable | Owner | Highest impact: it is the whole ledger and every player's details. Rotating breaks the running app until the variable is updated, so do it in that order deliberately |
| `MONZO_ACCESS_TOKEN` | Monzo developer portal — revoke the token and issue a new one | Owner | Payment ingress. Revoke immediately; a stale token only stops payment sync, while a leaked one exposes account data |
| `AUTH0_CLIENT_SECRET` | Auth0 dashboard → Applications → the app → Settings → Rotate | Owner | Rotating invalidates the old secret at once |
| `BREVO_API_KEY` | Brevo dashboard → SMTP & API → API keys — delete and recreate | Owner | Lets an attacker send mail as the group; low data risk, high reputational one |
| `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`, `VITE_API_BASE_URL` | Not secret | — | `VITE_`-prefixed values are compiled into the client bundle and are public by design. Do not treat a report on these as an incident |
| `MONZO_ACCOUNT_ID`, `BREVO_FROM_EMAIL`, `DEFAULT_HOST_SLUG` | Not secret | — | Identifiers, not credentials |

After rotating, purge the value from history (`git filter-repo` or BFG), force-push, and tell
every clone holder to re-clone — a rewrite does not reach existing clones or forks. Then re-run
the baseline scan above and confirm it is clean again.
