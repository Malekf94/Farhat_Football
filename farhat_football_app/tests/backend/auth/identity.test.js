import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
	makeFakePool,
	makeIdentityPool,
	reqWithEmail,
	reqWithSubject,
	SQL,
} from "../helpers/fakePool.js";

// AUTH-001. Identity is the immutable Auth0 subject, not the email address.
//
// Existing accounts predate the column, so the first authenticated request
// CLAIMS a row by matching its email once and binding the subject permanently.
// Everything after that resolves by subject alone — which is the whole point,
// because it is what makes a later email change irrelevant to privileges.
//
// The cases that must not be got wrong are the ones where an email is presented
// for a row that should not be claimed: an unverified address, an address
// matching two rows, and an address whose row is already bound to someone else.

const load = async () => {
	const mod = await import("../../../Apis/auth/identity.cjs");
	return mod.default ?? mod;
};

const EMAIL = "player@example.test";
const SUBJECT = "auth0|abc123";

describe("resolvePlayer", () => {
	const originalClaim = process.env.AUTH0_EMAIL_CLAIM;
	const originalVerifiedClaim = process.env.AUTH0_EMAIL_VERIFIED_CLAIM;

	beforeEach(() => {
		delete process.env.AUTH0_EMAIL_CLAIM;
		delete process.env.AUTH0_EMAIL_VERIFIED_CLAIM;
	});

	afterEach(() => {
		if (originalClaim === undefined) delete process.env.AUTH0_EMAIL_CLAIM;
		else process.env.AUTH0_EMAIL_CLAIM = originalClaim;
		if (originalVerifiedClaim === undefined)
			delete process.env.AUTH0_EMAIL_VERIFIED_CLAIM;
		else process.env.AUTH0_EMAIL_VERIFIED_CLAIM = originalVerifiedClaim;
	});

	const build = async (players, extraHandlers) => {
		const { createIdentity, UNRESOLVED } = await load();
		const pool = makeIdentityPool(players, extraHandlers);
		return { ...createIdentity(pool), pool, UNRESOLVED };
	};

	describe("a subject already bound to a player", () => {
		it("resolves to that player", async () => {
			const { resolvePlayer } = await build([
				{ player_id: 1, email: EMAIL, auth0_sub: SUBJECT, is_admin: true },
			]);

			const { player } = await resolvePlayer(reqWithSubject(SUBJECT));

			expect(player).toMatchObject({ player_id: 1, is_admin: true });
		});

		it("never consults the email at all", async () => {
			const { resolvePlayer, pool } = await build([
				{ player_id: 1, email: EMAIL, auth0_sub: SUBJECT },
			]);

			await resolvePlayer(reqWithSubject(SUBJECT, { email: EMAIL }));

			expect(pool.queriesMatching(SQL.BY_EMAIL)).toHaveLength(0);
		});

		// AC2. The address on the token has changed; the privileges must not.
		it("resolves to the same player after the token's email changes", async () => {
			const { resolvePlayer } = await build([
				{ player_id: 1, email: EMAIL, auth0_sub: SUBJECT, is_admin: true },
			]);

			const { player } = await resolvePlayer(
				reqWithSubject(SUBJECT, { email: "changed@example.test" }),
			);

			expect(player).toMatchObject({ player_id: 1, is_admin: true });
		});

		// The mirror image: presenting someone else's address must not move
		// identity to their row.
		it("ignores an email belonging to a different player", async () => {
			const { resolvePlayer } = await build([
				{ player_id: 1, email: EMAIL, auth0_sub: SUBJECT, is_admin: false },
				{ player_id: 2, email: "admin@example.test", is_admin: true },
			]);

			const { player } = await resolvePlayer(
				reqWithSubject(SUBJECT, { email: "admin@example.test" }),
			);

			expect(player).toMatchObject({ player_id: 1, is_admin: false });
		});
	});

	describe("claiming an existing account on first request", () => {
		it("binds the subject to the row matching the token email", async () => {
			const { resolvePlayer, pool } = await build([
				{ player_id: 1, email: EMAIL, is_admin: true },
			]);

			const result = await resolvePlayer(reqWithEmail(EMAIL));

			expect(result.player).toMatchObject({ player_id: 1, is_admin: true });
			expect(result.claimed).toBe(true);
			expect(pool.rows[0].auth0_sub).toBe(`auth0|${EMAIL}`);
		});

		it("matches the email case-insensitively", async () => {
			const { resolvePlayer, pool } = await build([
				{ player_id: 1, email: "Player@Example.test" },
			]);

			const { player } = await resolvePlayer(reqWithEmail("player@example.test"));

			expect(player).toMatchObject({ player_id: 1 });
			expect(pool.rows[0].auth0_sub).toBe("auth0|player@example.test");
		});

		it("claims only once — a second request resolves by subject", async () => {
			const { resolvePlayer, pool } = await build([
				{ player_id: 1, email: EMAIL },
			]);

			await resolvePlayer(reqWithEmail(EMAIL));
			const before = pool.queriesMatching(SQL.CLAIM).length;
			const { player } = await resolvePlayer(reqWithEmail(EMAIL));

			expect(player).toMatchObject({ player_id: 1 });
			expect(before).toBe(1);
			expect(pool.queriesMatching(SQL.CLAIM)).toHaveLength(1);
		});

		it("reads the email from AUTH0_EMAIL_CLAIM when the tenant namespaces it", async () => {
			const claim = "https://farhatfootball.co.uk/email";
			process.env.AUTH0_EMAIL_CLAIM = claim;
			const { resolvePlayer } = await build([{ player_id: 1, email: EMAIL }]);

			const { player } = await resolvePlayer(
				reqWithSubject(SUBJECT, { [claim]: EMAIL }),
			);

			expect(player).toMatchObject({ player_id: 1 });
		});
	});

	describe("refusing to resolve", () => {
		it("refuses a token with no subject, without querying", async () => {
			const { resolvePlayer, pool, UNRESOLVED } = await build([
				{ player_id: 1, email: EMAIL },
			]);

			const { player, reason } = await resolvePlayer({
				auth: { payload: { email: EMAIL } },
			});

			expect(player).toBeNull();
			expect(reason).toBe(UNRESOLVED.NO_SUBJECT);
			expect(pool.query).not.toHaveBeenCalled();
		});

		it("refuses a subject with no email and no binding", async () => {
			const { resolvePlayer, UNRESOLVED } = await build([]);

			const { player, reason } = await resolvePlayer(reqWithSubject(SUBJECT));

			expect(player).toBeNull();
			expect(reason).toBe(UNRESOLVED.NO_ACCOUNT);
		});

		it("refuses an email matching no player", async () => {
			const { resolvePlayer, UNRESOLVED } = await build([
				{ player_id: 1, email: EMAIL },
			]);

			const { player, reason } = await resolvePlayer(
				reqWithEmail("nobody@example.test"),
			);

			expect(player).toBeNull();
			expect(reason).toBe(UNRESOLVED.NO_ACCOUNT);
		});

		// AC3, unverified. An address the tenant has not confirmed must not be
		// able to claim an account that already exists.
		it("refuses to claim when the tenant reports the email as unverified", async () => {
			const { resolvePlayer, pool, UNRESOLVED } = await build([
				{ player_id: 1, email: EMAIL, is_admin: true },
			]);

			const { player, reason } = await resolvePlayer(
				reqWithSubject(SUBJECT, { email: EMAIL, email_verified: false }),
			);

			expect(player).toBeNull();
			expect(reason).toBe(UNRESOLVED.UNVERIFIED_EMAIL);
			expect(pool.rows[0].auth0_sub).toBeNull();
		});

		it("honours a namespaced verified claim", async () => {
			const claim = "https://farhatfootball.co.uk/email_verified";
			process.env.AUTH0_EMAIL_VERIFIED_CLAIM = claim;
			const { resolvePlayer, UNRESOLVED } = await build([
				{ player_id: 1, email: EMAIL },
			]);

			const { reason } = await resolvePlayer(
				reqWithSubject(SUBJECT, { email: EMAIL, [claim]: false }),
			);

			expect(reason).toBe(UNRESOLVED.UNVERIFIED_EMAIL);
		});

		// Absent is not the same as false: no tenant here emits the claim yet, and
		// treating absence as unverified would lock everyone out.
		it("still claims when the tenant does not emit a verified flag at all", async () => {
			const { resolvePlayer } = await build([{ player_id: 1, email: EMAIL }]);

			const { player } = await resolvePlayer(reqWithEmail(EMAIL));

			expect(player).toMatchObject({ player_id: 1 });
		});

		// AC3, duplicates. players.email is UNIQUE but varchar comparison is
		// case-sensitive, so two rows can be the same mailbox. Picking one would
		// hand a player someone else's privileges.
		it("refuses when the email matches more than one row", async () => {
			const { resolvePlayer, pool, UNRESOLVED } = await build([
				{ player_id: 1, email: "Dup@example.test", is_admin: true },
				{ player_id: 2, email: "dup@example.test", is_admin: false },
			]);

			const { player, reason } = await resolvePlayer(
				reqWithEmail("dup@example.test"),
			);

			expect(player).toBeNull();
			expect(reason).toBe(UNRESOLVED.AMBIGUOUS_EMAIL);
			expect(pool.queriesMatching(SQL.CLAIM)).toHaveLength(0);
		});

		// The takeover case: a second Auth0 account presenting an address whose
		// row is already bound must not inherit it.
		it("refuses an email whose row is already bound to a different subject", async () => {
			const { resolvePlayer, pool, UNRESOLVED } = await build([
				{
					player_id: 1,
					email: EMAIL,
					auth0_sub: "auth0|original",
					is_admin: true,
				},
			]);

			const { player, reason } = await resolvePlayer(
				reqWithSubject("auth0|impostor", { email: EMAIL }),
			);

			expect(player).toBeNull();
			expect(reason).toBe(UNRESOLVED.NO_ACCOUNT);
			expect(pool.rows[0].auth0_sub).toBe("auth0|original");
			expect(pool.queriesMatching(SQL.CLAIM)).toHaveLength(0);
		});
	});

	describe("losing a race with a concurrent first request", () => {
		it("resolves to the player when the concurrent claim was our own", async () => {
			const { createIdentity } = await load();
			const row = {
				player_id: 1,
				email: EMAIL,
				is_admin: true,
				auth0_sub: null,
			};
			let claimAttempted = false;
			const pool = makeFakePool([
				{
					match: SQL.CLAIM,
					// Simulate another worker binding the same subject a moment earlier:
					// the guarded UPDATE matches nothing.
					rows: () => {
						claimAttempted = true;
						row.auth0_sub = SUBJECT;
						return [];
					},
				},
				{
					match: SQL.BY_SUBJECT,
					rows: ([subject]) => (row.auth0_sub === subject ? [{ ...row }] : []),
				},
				{ match: SQL.BY_EMAIL, rows: () => [{ ...row }] },
			]);

			const { player } = await createIdentity(pool).resolvePlayer(
				reqWithSubject(SUBJECT, { email: EMAIL }),
			);

			expect(claimAttempted).toBe(true);
			expect(player).toMatchObject({ player_id: 1, is_admin: true });
		});

		it("refuses when the row was claimed by somebody else", async () => {
			const { createIdentity, UNRESOLVED } = await load();
			const pool = makeFakePool([
				{ match: SQL.CLAIM, rows: [] },
				{ match: SQL.BY_SUBJECT, rows: [] },
				{
					match: SQL.BY_EMAIL,
					rows: [{ player_id: 1, email: EMAIL, auth0_sub: null }],
				},
			]);

			const { player, reason } = await createIdentity(pool).resolvePlayer(
				reqWithSubject(SUBJECT, { email: EMAIL }),
			);

			expect(player).toBeNull();
			expect(reason).toBe(UNRESOLVED.NO_ACCOUNT);
		});
	});
});
