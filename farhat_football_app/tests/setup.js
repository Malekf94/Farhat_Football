// Point the pool at an unreachable address before any module can read the real
// value. db.cjs calls dotenv.config(), and dotenv does not override a variable
// that is already set — so this wins over whatever is in .env.
//
// This matters because backend modules require() the shared pool at import time
// and vi.mock() cannot intercept a require() inside a .cjs module. Without this
// guard, importing one of them from a test opens a connection to whatever .env
// points at, which may be production.
process.env.DATABASE_URL = "postgres://blocked:blocked@127.0.0.1:1/no-db-in-unit-tests";
