# Farhat Football — developer setup

## Prerequisites
- Node.js (18+)
- PostgreSQL (a local instance, or a staging DB connection string)

## Run it locally
1. Clone the repo and install:
   ```bash
   cd farhat_football_app
   npm install
   ```
2. Create your env file and fill it in:
   ```bash
   cp .env.example .env
   ```
   Use **your own dev values** — a local/staging database, and a **dev Auth0
   application** (see below). Leave the Monzo and Brevo secrets blank; payments
   and emails simply won't fire locally, which is fine for development.
3. Create the database schema (see `schema.sql` at the repo root — generate it
   with `pg_dump --schema-only` from an existing environment):
   ```bash
   psql "$DATABASE_URL" -f ../schema.sql
   ```
4. Start both the API and the frontend together:
   ```bash
   npm run dev
   ```
   - Frontend: http://localhost:5173
   - API: http://localhost:3000

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
