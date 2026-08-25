import { describe, it, expect, beforeEach } from "vitest";
import { pool, resetDatabase, insertPlayer, requestFor } from "../helpers/seed.js";

// AUTH-001 against the real schema. The unit tests drive the resolver's logic
// with a fake pool; these prove that migration 0002 actually applied, that the
// partial unique index enforces one player per subject in PostgreSQL rather
// than only in JavaScript, and that claiming an account works end to end.

const identity = await import("../../../Apis/auth/identity.cjs");
const { resolvePlayer, UNRESOLVED, createIdentity } = identity.default ?? identity;

const subjectOf = async (playerId) => {
	const { rows } = await pool.query(
		"SELECT auth0_sub FROM players WHERE player_id = $1",
		[playerId],
	);
	return rows[0]?.auth0_sub ?? null;
};

describe("migration 0002 — auth0_sub", () => {
	beforeEach(resetDatabase);

	it("added a nullable text column to players", async () => {
		const { rows } = await pool.query(
			`SELECT data_type, is_nullable FROM information_schema.columns
			 WHERE table_schema = 'public' AND table_name = 'players'
			   AND column_name = 'auth0_sub'`,
		);

		expect(rows).toHaveLength(1);
		expect(rows[0].data_type).toBe("text");
		expect(rows[0].is_nullable).toBe("YES");
	});

	it("created the partial unique index", async () => {
		const { rows } = await pool.query(
			`SELECT indexdef FROM pg_indexes
			 WHERE schemaname = 'public' AND indexname = 'players_auth0_sub_key'`,
		);

		expect(rows).toHaveLength(1);
		expect(rows[0].indexdef).toContain("UNIQUE");
		expect(rows[0].indexdef).toContain("auth0_sub IS NOT NULL");
	});

	it("lets many players sit unclaimed, because NULLs are not constrained", async () => {
		await insertPlayer();
		await insertPlayer();

		const { rows } = await pool.query(
			"SELECT count(*)::int AS n FROM players WHERE auth0_sub IS NULL",
		);
		expect(rows[0].n).toBe(2);
	});

	it("refuses to bind one subject to two players", async () => {
		const first = await insertPlayer();
		const second = await insertPlayer();
		await pool.query("UPDATE players SET auth0_sub = $1 WHERE player_id = $2", [
			"auth0|shared",
			first.player_id,
		]);

		await expect(
			pool.query("UPDATE players SET auth0_sub = $1 WHERE player_id = $2", [
				"auth0|shared",
				second.player_id,
			]),
		).rejects.toThrow(/players_auth0_sub_key/);
	});
});

describe("resolvePlayer against the real database", () => {
	beforeEach(resetDatabase);

	it("claims an existing account on the first authenticated request", async () => {
		const player = await insertPlayer({ is_admin: true });

		const result = await resolvePlayer(requestFor(player.email));

		expect(result.player.player_id).toBe(player.player_id);
		expect(result.player.is_admin).toBe(true);
		expect(result.claimed).toBe(true);
		expect(await subjectOf(player.player_id)).toBe(`auth0|${player.email}`);
	});

	it("resolves by subject on every request after the first", async () => {
		const player = await insertPlayer();
		await resolvePlayer(requestFor(player.email));

		const { player: again, claimed } = await resolvePlayer(
			requestFor(player.email),
		);

		expect(again.player_id).toBe(player.player_id);
		expect(claimed).toBeUndefined();
	});

	// AC2 against real data: the address on the row is changed after binding, and
	// the same token still resolves to the same player with the same privileges.
	it("keeps privileges when the email on the row changes", async () => {
		const player = await insertPlayer({ is_admin: true });
		const req = requestFor(player.email);
		await resolvePlayer(req);

		await pool.query("UPDATE players SET email = $1 WHERE player_id = $2", [
			"renamed@example.test",
			player.player_id,
		]);
		const { player: resolved } = await resolvePlayer(req);

		expect(resolved.player_id).toBe(player.player_id);
		expect(resolved.is_admin).toBe(true);
	});

	it("does not let a second subject take over a claimed account", async () => {
		const player = await insertPlayer({ is_admin: true });
		await resolvePlayer(requestFor(player.email));

		const { player: impostor, reason } = await resolvePlayer({
			auth: { payload: { sub: "auth0|impostor", email: player.email } },
		});

		expect(impostor).toBeNull();
		expect(reason).toBe(UNRESOLVED.NO_ACCOUNT);
		expect(await subjectOf(player.player_id)).toBe(`auth0|${player.email}`);
	});

	it("refuses an unverified email rather than claiming with it", async () => {
		const player = await insertPlayer({ is_admin: true });

		const { player: resolved, reason } = await resolvePlayer({
			auth: {
				payload: {
					sub: "auth0|new",
					email: player.email,
					email_verified: false,
				},
			},
		});

		expect(resolved).toBeNull();
		expect(reason).toBe(UNRESOLVED.UNVERIFIED_EMAIL);
		expect(await subjectOf(player.player_id)).toBeNull();
	});

	it("refuses when two rows differ only by the case of the email", async () => {
		const player = await insertPlayer();
		const upper = player.email.toUpperCase();
		await pool.query(
			`INSERT INTO players
				(first_name, last_name, preferred_name, year_of_birth, email)
			 VALUES ('Case', 'Clash', 'caseclash', 1995, $1)`,
			[upper],
		);

		const { player: resolved, reason } = await resolvePlayer(
			requestFor(player.email),
		);

		expect(resolved).toBeNull();
		expect(reason).toBe(UNRESOLVED.AMBIGUOUS_EMAIL);
		expect(await subjectOf(player.player_id)).toBeNull();
	});

	// The `AND auth0_sub IS NULL` clause in the claim is what decides a race
	// between two concurrent first requests: both read the row as unclaimed, and
	// only one UPDATE may bind it. That clause lives in SQL, so a fake pool
	// cannot prove it — this drives the real statement directly.
	describe("the claim statement itself", () => {
		it("binds a row that has no subject", async () => {
			const player = await insertPlayer();

			const claimed = await createIdentity().claim(
				player.player_id,
				"auth0|first",
			);

			expect(claimed.player_id).toBe(player.player_id);
			expect(await subjectOf(player.player_id)).toBe("auth0|first");
		});

		it("refuses to rebind a row that already has one, and changes nothing", async () => {
			const player = await insertPlayer();
			const { claim } = createIdentity();
			await claim(player.player_id, "auth0|first");

			const second = await claim(player.player_id, "auth0|second");

			expect(second).toBeNull();
			expect(await subjectOf(player.player_id)).toBe("auth0|first");
		});

		it("lets only one of two concurrent claims win", async () => {
			const player = await insertPlayer();
			const { claim } = createIdentity();

			const results = await Promise.all([
				claim(player.player_id, "auth0|a"),
				claim(player.player_id, "auth0|b"),
			]);

			expect(results.filter(Boolean)).toHaveLength(1);
			expect(await subjectOf(player.player_id)).toBe(
				results.find(Boolean).auth0_sub,
			);
		});
	});

	it("refuses a token carrying no subject", async () => {
		const player = await insertPlayer();

		const { player: resolved, reason } = await resolvePlayer({
			auth: { payload: { email: player.email } },
		});

		expect(resolved).toBeNull();
		expect(reason).toBe(UNRESOLVED.NO_SUBJECT);
	});
});
