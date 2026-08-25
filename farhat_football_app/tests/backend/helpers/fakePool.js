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

// A request carrying a verified token payload, as checkJwt would leave it.
export const reqWithEmail = (email, rest = {}) => ({
	auth: { payload: { sub: "auth0|test", email } },
	...rest,
});

export const spyNext = () => vi.fn();
