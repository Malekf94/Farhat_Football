import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// requireAdmin resolves identity from the verified token and reads the admin
// flags from the database, so most of it needs a pool this suite cannot fake.
// The one branch that never queries is the refusal when the token carries no
// email claim — it returns before the lookup. That branch is what stops an
// unidentifiable caller reaching an admin-only handler, so it is worth pinning.
// Anything past it would surface as a 500 from the catch block (the pool is a
// dead sentinel), which is how these tests tell "refused early" from "queried".

const load = async () => {
	const mod = await import("../../../Apis/auth/requireAdmin.cjs");
	return mod.default ?? mod;
};

const makeRes = () => {
	const res = {
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
	};
	return res;
};

describe("requireAdmin", () => {
	let next;
	const originalClaim = process.env.AUTH0_EMAIL_CLAIM;

	beforeEach(() => {
		next = vi.fn();
		delete process.env.AUTH0_EMAIL_CLAIM;
	});

	afterEach(() => {
		if (originalClaim === undefined) {
			delete process.env.AUTH0_EMAIL_CLAIM;
		} else {
			process.env.AUTH0_EMAIL_CLAIM = originalClaim;
		}
	});

	it("refuses a request with no verified token at all", async () => {
		const requireAdmin = await load();
		const res = makeRes();

		await requireAdmin()({}, res, next);

		expect(res.statusCode).toBe(403);
		expect(res.body).toEqual({
			error: "Could not verify identity from token.",
		});
		expect(next).not.toHaveBeenCalled();
	});

	it("refuses a verified token whose payload carries no email claim", async () => {
		const requireAdmin = await load();
		const res = makeRes();

		await requireAdmin()({ auth: { payload: { sub: "auth0|abc" } } }, res, next);

		expect(res.statusCode).toBe(403);
		expect(next).not.toHaveBeenCalled();
	});

	it("refuses when AUTH0_EMAIL_CLAIM is configured but absent from the payload", async () => {
		process.env.AUTH0_EMAIL_CLAIM = "https://farhatfootball.co.uk/email";
		const requireAdmin = await load();
		const res = makeRes();

		await requireAdmin()({ auth: { payload: { sub: "auth0|abc" } } }, res, next);

		expect(res.statusCode).toBe(403);
		expect(next).not.toHaveBeenCalled();
	});

	it("refuses an unidentifiable caller on the superadmin variant too", async () => {
		const requireAdmin = await load();
		const res = makeRes();

		await requireAdmin({ superadmin: true })({ auth: {} }, res, next);

		expect(res.statusCode).toBe(403);
		expect(next).not.toHaveBeenCalled();
	});
});
