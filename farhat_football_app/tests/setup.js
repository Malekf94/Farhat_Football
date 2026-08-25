// Point the pool at an unreachable address before any module can read the real
// value. db.cjs calls dotenv.config(), and dotenv does not override a variable
// that is already set — so this wins over whatever is in .env.
//
// This matters because backend modules require() the shared pool at import time
// and vi.mock() cannot intercept a require() inside a .cjs module. Without this
// guard, importing one of them from a test opens a connection to whatever .env
// points at, which may be production.
process.env.DATABASE_URL = "postgres://blocked:blocked@127.0.0.1:1/no-db-in-unit-tests";

// checkJwt.cjs builds its Auth0 verifier at require time and throws
// "An 'audience' is required to validate the 'aud' claim" when
// VITE_AUTH0_AUDIENCE is unset — before app.cjs can finish loading. That is the
// same crash that took the staging deploy down (the process dies during module
// loading and never binds a port). Pinning both values here keeps importing the
// app a pure, offline operation; neither is a credential and neither is used to
// verify a real token in unit tests.
process.env.VITE_AUTH0_AUDIENCE ||= "https://unit-tests.invalid/api";
process.env.AUTH0_DOMAIN ||= "unit-tests.invalid";
