import { describe, it, expect, beforeEach } from "vitest";
import { resetDatabase, insertPlayer, requestFor, makeResponse } from "../helpers/seed.js";

// SEC-008. /players/check used to take an email from the QUERY STRING and
// return that player's id and admin flags, so any token holder could enumerate
// accounts and read someone else's privileges by asking about their address.
//
// It now answers only about the caller, resolved from the token's immutable
// subject. These run against the real database because the controller takes the
// shared pool directly.

const controller = await import("../../../Apis/players/controller.cjs");
const { checkEmail } = controller.default ?? controller;

describe("GET /players/check", () => {
	beforeEach(resetDatabase);

	it("returns the caller's own id and flags", async () => {
		const player = await insertPlayer({ is_admin: true, is_superadmin: false });
		const res = makeResponse();

		await checkEmail(requestFor(player.email), res);

		expect(res.body).toEqual({
			exists: true,
			player_id: player.player_id,
			is_admin: true,
			is_superadmin: false,
		});
	});

	// The hole this ticket closes: asking about somebody else must not describe
	// them. The query is ignored, so the caller is described instead.
	it("ignores an email in the query and still answers about the caller", async () => {
		const caller = await insertPlayer({ is_admin: false });
		const admin = await insertPlayer({ is_admin: true, is_superadmin: true });
		const res = makeResponse();

		const req = requestFor(caller.email, { query: { email: admin.email } });
		await checkEmail(req, res);

		expect(res.body.player_id).toBe(caller.player_id);
		expect(res.body.is_admin).toBe(false);
		expect(res.body.is_superadmin).toBe(false);
	});

	it("does not disclose another player's admin flags to an ordinary caller", async () => {
		const caller = await insertPlayer({ is_admin: false });
		const superadmin = await insertPlayer({ is_admin: true, is_superadmin: true });
		const res = makeResponse();

		await checkEmail(
			requestFor(caller.email, { query: { email: superadmin.email } }),
			res,
		);

		expect(res.body.player_id).not.toBe(superadmin.player_id);
		expect(JSON.stringify(res.body)).not.toContain(String(superadmin.player_id));
	});

	// An authenticated user who has not finished signup yet. The signup flow
	// depends on this being a normal answer rather than an error.
	it("reports exists:false for a token with no matching player", async () => {
		const res = makeResponse();

		await checkEmail(requestFor("nobody@example.test"), res);

		expect(res.body).toEqual({ exists: false });
		expect(res.statusCode).toBeNull();
	});

	it("refuses a token carrying no subject", async () => {
		const player = await insertPlayer();
		const res = makeResponse();

		await checkEmail({ auth: { payload: { email: player.email } } }, res);

		expect(res.statusCode).toBe(403);
		expect(res.body).toEqual({ error: "Could not verify identity from token." });
	});

	it("refuses rather than answering when the email is unverified", async () => {
		const player = await insertPlayer({ is_admin: true });
		const res = makeResponse();

		await checkEmail(
			{
				auth: {
					payload: {
						sub: "auth0|new",
						email: player.email,
						email_verified: false,
					},
				},
			},
			res,
		);

		expect(res.statusCode).toBe(403);
		expect(res.body).toEqual({ error: "Email address is not verified." });
	});

	it("keeps answering for the same player after their email changes", async () => {
		const player = await insertPlayer({ is_admin: true });
		const req = requestFor(player.email);
		await checkEmail(req, makeResponse());

		const { pool } = await import("../helpers/seed.js");
		await pool.query("UPDATE players SET email = $1 WHERE player_id = $2", [
			"renamed@example.test",
			player.player_id,
		]);
		const res = makeResponse();
		await checkEmail(req, res);

		expect(res.body).toEqual({
			exists: true,
			player_id: player.player_id,
			is_admin: true,
			is_superadmin: false,
		});
	});
});
