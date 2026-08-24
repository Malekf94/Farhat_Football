---
paths:
  - "farhat_football_app/src/**/*"
  - "farhat_football_app/index.html"
  - "farhat_football_app/vite.config.js"
  - "farhat_football_app/eslint.config.js"
---

# Frontend rules

Loaded when working in the SPA. React 18 + Vite, ESM `.jsx`, plain CSS — no component library, no
state manager, no CSS framework. General execution traps are the
[`repo-pitfalls`](../skills/repo-pitfalls/SKILL.md) skill; the route and page inventory is
[`.cursor/REPO_MAP.md`](../../.cursor/REPO_MAP.md).

## Structure

- **One folder per page**: `src/Pages/<Name>/<Name>.jsx` + `<Name>.css`. Shared UI goes in
  `src/components/`.
- New frontend file → **`.jsx`**.
- Reuse `src/components/`, `src/hooks/` and `src/context/` before writing new UI or new state.
  `ConfirmModal`, `RadarChart` (hand-rolled SVG, not Recharts), `UpdateBanner`,
  `useCurrentPlayer`, `useMyHosts` already exist.
- Tabs, and plain CSS per page. Avoid broad restyling.

## HTTP

`src/api.jsx` exports two axios instances — nothing else should create one:

- **`publicApi`** — unauthenticated endpoints.
- **`privateApi`** — anything behind `checkJwt`. Attaches the Auth0 bearer token, and retries
  once on 401 with a fresh token (`cacheMode: "off"`). A **403 is deliberately not retried** —
  it means genuinely not allowed, so handle it in the caller.

`setupInterceptors(getAccessTokenSilently)` is called once from `App.jsx`; do not call it again
from a page.

## Host portals

The app serves several portals. The default portal has **no slug segment**; others live under
`/h/:slug`.

- In `App.jsx`, `PortalRoutes()` is rendered **twice** — once at the root, once nested under
  `/h/:slug` — both wrapped in `HostLayout` → `HostProvider`. Add a portal-scoped route inside
  `PortalRoutes()`; add a global page (players, leaderboards, rules, account) outside it.
- Read the current portal with `useHost()` from `src/context/HostContext.jsx`:
  `{ host, hostId, slug, isDefault, hostPath }`.
- **Build every internal link with `hostPath("/matches")`**, never a bare `/matches`. A hard-coded
  path silently kicks the user out of `/h/<slug>` back to the default portal — it still renders,
  which is why this is easy to miss in review.

## Route guards

| Guard | Requires |
|---|---|
| `ProtectedRoute` | Auth0 login |
| `ProtectedAdminRoute` | login + `is_admin` |
| `ProtectedHostAdminRoute` | admin rights over the active host |
| `ProtectedSuperAdminRoute` | `is_superadmin` |

These are **UI gating only**. Adding an admin page means adding the matching server guard too —
see [`backend.md`](backend.md) §Authorization. Current player identity and flags come from
`useCurrentPlayer()`, which calls `/api/v1/players/check`.

## Commands

Run from `farhat_football_app/`.

| Purpose | Command |
|---|---|
| Dev (API + client) | `npm run dev` |
| Client only | `npm run client` |
| Lint (`**/*.{js,jsx}`) | `npm run lint` |
| Production build → `dist/client` | `npm run build` |

## Toolchain gaps that bite

- **ESLint covers `**/*.{js,jsx}` only** (`eslint.config.js:10`), so a green `npm run lint` says
  nothing about any `.cjs` backend file you touched in the same change.
- **Lint has a red baseline** — 17 errors and 5 warnings pre-exist (unused `err` bindings,
  exhaustive-deps, fast-refresh) in files unrelated to most changes. Compare against that
  baseline rather than expecting zero; do not "fix" unrelated ones in passing.
- **`prop-types` is imported by `RadarChart.jsx` and `HostContext.jsx` but is not declared in
  `package.json`** — it resolves transitively today. Declare it if you touch those dependencies.
- **Component rendering is not testable yet** — the Vitest environment is `node`, with no jsdom
  and no Testing Library. Pure logic and helpers are testable. → [`testing.md`](testing.md)
