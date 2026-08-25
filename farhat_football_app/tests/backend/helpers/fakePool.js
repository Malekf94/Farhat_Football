import { vi } from "vitest";

// TEST-002 seams. Backend guards now accept a pool, so a unit test can supply
// this instead of the shared pg pool and exercise the branches that query —
// vi.mock() cannot intercept the require() inside a .cjs module, which is why
// injection is the only route.

// Routes each query to the first handler whose `match` fragment appears in the
// SQL, so tests match on intent rather than call order. An unmatched query
// throws: a fake that quietly returns nothing turns a real defect green.
//
//   makeFakePool([{ match: "FROM players", rows: [{ player_id: 1 }] }])
//
// `rows` may be a function of the query parameters for cases that depend on them.
export const makeFakePool = (handlers = []) => {
	const calls = [];

	const query = vi.fn(async (text, params) => {
		calls.push({ text, params });
		const handler = handlers.find((candidate) => text.includes(candidate.match));
		if (!handler) {
			throw new Error(`fake pool received an unexpected query: ${text}`);
		}
		if (handler.throws) {
			throw handler.throws;
		}
		const rows =
			typeof handler.rows === "function" ? handler.rows(params) : handler.rows;
		return { rows: rows ?? [] };
	});

	return {
		query,
		calls,
		// Every query whose SQL contains the fragment, for asserting what was asked.
		queriesMatching: (fragment) =>
			calls.filter((call) => call.text.includes(fragment)),
	};
};

// The three statements the AUTH-001 identity resolver issues. Kept here so a
// change to the resolver's SQL breaks these fakes loudly rather than silently
// falling through to "unexpected query".
export const SQL = {
	BY_SUBJECT: "WHERE auth0_sub = $1",
	BY_EMAIL: "lower(email) = lower($1)",
	CLAIM: "UPDATE players SET auth0_sub",
};

// Models just enough of the players table for the resolver: lookup by subject,
// case-insensitive lookup by email, and the claim that binds a subject to an
// unclaimed row. Rows are mutated by a successful claim, so a test can assert
// what the binding ended up as.
export const makeIdentityPool = (players = [], extraHandlers = []) => {
	const rows = players.map((player) => ({ auth0_sub: null, ...player }));
	const copy = (row) => ({ ...row });

	const pool = makeFakePool([
		{
			match: SQL.CLAIM,
			rows: ([subject, playerId]) => {
				const row = rows.find(
					(candidate) =>
						candidate.player_id === playerId && candidate.auth0_sub === null,
				);
				if (!row) return [];
				row.auth0_sub = subject;
				return [copy(row)];
			},
		},
		{
			match: SQL.BY_SUBJECT,
			rows: ([subject]) =>
				rows.filter((row) => row.auth0_sub === subject).map(copy),
		},
		{
			match: SQL.BY_EMAIL,
			rows: ([email]) =>
				rows
					.filter(
						(row) =>
							String(row.email).toLowerCase() === String(email).toLowerCase(),
					)
					.map(copy),
		},
		...extraHandlers,
	]);

	pool.rows = rows;
	return pool;
};

// Minimal Express response double: records the status and JSON body a guard set.
export const makeRes = () => ({
	statusCode: null,
	body: null,
	status(code) {
		this.statusCode = code;
		return this;
	},
	json(payload) {
		this.body = payload;
		return this;
	},
});

// A request carrying a verified token, shaped the way checkJwt leaves it. Every
// genuine Auth0 access token carries `sub`; it is derived from the email here
// only so that one caller keeps one stable subject across a test.
export const reqWithEmail = (email, rest = {}) => ({
	auth: { payload: { sub: `auth0|${email}`, email } },
	...rest,
});

// A token for a caller already bound to a known subject, for the steady state
// after adoption — where the email in the token no longer matters.
export const reqWithSubject = (sub, payload = {}, rest = {}) => ({
	auth: { payload: { sub, ...payload } },
	...rest,
});

export const spyNext = () => vi.fn();
