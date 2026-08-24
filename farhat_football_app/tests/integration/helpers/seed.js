// Seed helpers for the disposable database. These deliberately reuse the same
// shared pool the production code requires, so a test exercises the connection
// the module under test actually uses.
const mod = await import("../../../db.cjs");
export const pool = mod.default ?? mod;

// Tables the seeds below write, plus the two the triggers write into:
// trg_apply_payment logs to trigger_log, and account_balance_audit logs to
// audit_log whenever the payment trigger moves a balance.
const TABLES = [
	"payments",
	"attributes",
	"match_players",
	"matches",
	"pitches",
	"host_admins",
	"hosts",
	"bans",
	"players",
	"trigger_log",
	"audit_log",
];

export async function resetDatabase() {
	await pool.query(`TRUNCATE ${TABLES.join(", ")} RESTART IDENTITY CASCADE`);
}

let sequence = 0;

// year_of_birth has a CHECK constraint (> 1970 and < 2009) and email is UNIQUE,
// so both are generated rather than hard-coded.
export async function insertPlayer({
	first_name = "Test",
	last_name = "Player",
	preferred_name,
	is_admin = false,
	is_superadmin = false,
	account_balance = 0,
} = {}) {
	sequence += 1;
	const { rows } = await pool.query(
		`INSERT INTO players
			(first_name, last_name, preferred_name, year_of_birth, email,
			 account_balance, is_admin, is_superadmin)
		 VALUES ($1, $2, $3, 1995, $4, $5, $6, $7)
		 RETURNING player_id, email, is_admin, is_superadmin`,
		[
			first_name,
			last_name,
			preferred_name ?? `${first_name}${sequence}`,
			`player${sequence}@example.test`,
			account_balance,
			is_admin,
			is_superadmin,
		],
	);
	return rows[0];
}

export async function insertPayment({
	user_id,
	amount,
	transaction_id,
	description = "Test payment",
	processed = true,
	payment_date = new Date("2026-01-15T12:00:00Z"),
}) {
	const { rows } = await pool.query(
		`INSERT INTO payments
			(user_id, amount, transaction_id, description, processed, payment_date)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 ON CONFLICT (transaction_id) DO NOTHING
		 RETURNING payment_id`,
		[user_id, amount, transaction_id, description, processed, payment_date],
	);
	return rows[0] ?? null;
}

// A request carrying a verified token for this email, shaped the way checkJwt
// leaves it on req.
export const requestFor = (email, extra = {}) => ({
	auth: { payload: { sub: `auth0|${email}`, email } },
	...extra,
});

export function makeResponse() {
	return {
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
}

// The default host is resolved by slug (DEFAULT_HOST_SLUG, "farhat" by default)
// and memoised at module scope inside requireHostAdmin.cjs. Tests that care
// about the default-host tier must keep its id stable across a truncate, or
// reset modules — see .claude/rules/testing.md.
export const DEFAULT_HOST_SLUG = process.env.DEFAULT_HOST_SLUG || "farhat";

export async function insertHost({ name = "Test Host", slug } = {}) {
	sequence += 1;
	const { rows } = await pool.query(
		"INSERT INTO hosts (name, slug) VALUES ($1, $2) RETURNING host_id, slug",
		[name, slug ?? `host-${sequence}`],
	);
	return rows[0];
}

export async function makeHostAdmin(hostId, playerId) {
	await pool.query(
		"INSERT INTO host_admins (host_id, player_id) VALUES ($1, $2)",
		[hostId, playerId],
	);
}

export async function insertPitch({ price = 60 } = {}) {
	sequence += 1;
	const { rows } = await pool.query(
		`INSERT INTO pitches (pitch_name, pitch_number, address, postcode, price)
		 VALUES ($1, 1, '1 Test Street', 'AB1 2CD', $2)
		 RETURNING pitch_id`,
		[`Pitch ${sequence}`, price],
	);
	return rows[0];
}

// match_name is written by the generate_match_name trigger, which reads the
// pitch row, so a match always needs a real pitch.
export async function insertMatch({
	host_id = null,
	price = 6,
	number_of_players = 10,
	match_status = "upcoming",
	match_date = "2026-09-01",
	match_time = "19:00:00",
} = {}) {
	const pitch = await insertPitch();
	const { rows } = await pool.query(
		`INSERT INTO matches
			(match_date, match_time, price, number_of_players, pitch_id,
			 match_status, host_id)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING match_id, host_id, price`,
		[match_date, match_time, price, number_of_players, pitch.pitch_id, match_status, host_id],
	);
	return rows[0];
}
