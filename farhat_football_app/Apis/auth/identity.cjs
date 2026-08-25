const defaultPool = require("../../db.cjs");

// AUTH-001. The single place a request becomes a player.
//
// Identity is the Auth0 `sub` claim, which is immutable for the life of the
// account. Email is not: it can be changed in Auth0 or re-assigned to someone
// else, and every guard used to resolve privileges from it.
//
// Existing accounts predate the column, so a subject is CLAIMED on first
// authenticated request — matched to one unclaimed row by email, then bound
// permanently. Everything after that resolves by subject alone, which is what
// makes a later email change irrelevant to privileges.

// The claim carrying the caller's email. Auth0 access tokens do not include
// `email` by default; a tenant Action adds it, usually under a namespace, and
// AUTH0_EMAIL_CLAIM names it.
function getEmailFromToken(req) {
	const payload = req.auth?.payload || {};
	const claim = process.env.AUTH0_EMAIL_CLAIM;
	return (claim && payload[claim]) || payload.email || null;
}

// The immutable subject. Present on every genuine Auth0 access token.
function getSubjectFromToken(req) {
	return req.auth?.payload?.sub || null;
}

// Tri-state on purpose: true, false, or null when the tenant does not put the
// flag in the token at all. Only an explicit false blocks a claim — treating
// "absent" as unverified would lock out every deployment that has not added
// the claim, which today includes production.
function getEmailVerifiedFromToken(req) {
	const payload = req.auth?.payload || {};
	const claim = process.env.AUTH0_EMAIL_VERIFIED_CLAIM;
	const value = claim ? payload[claim] : payload.email_verified;
	if (value === undefined || value === null) return null;
	return value === true || value === "true";
}

// Why a caller could not be resolved. Guards map these to a response; keeping
// them distinct means an ambiguous account does not look like a missing one.
const UNRESOLVED = {
	NO_SUBJECT: "no_subject",
	NO_ACCOUNT: "no_account",
	UNVERIFIED_EMAIL: "unverified_email",
	AMBIGUOUS_EMAIL: "ambiguous_email",
};

const PLAYER_COLUMNS = "player_id, email, is_admin, is_superadmin, auth0_sub";

const createIdentity = (pool = defaultPool) => {
	async function findBySubject(subject) {
		const { rows } = await pool.query(
			`SELECT ${PLAYER_COLUMNS} FROM players WHERE auth0_sub = $1`,
			[subject],
		);
		return rows[0] || null;
	}

	// Case-insensitive on purpose. players.email is UNIQUE but varchar
	// comparison is case-sensitive, so "Bob@x" and "bob@x" are two rows and the
	// same mailbox. Matching insensitively is what makes that ambiguity visible
	// here instead of silently picking one.
	async function findByEmail(email) {
		const { rows } = await pool.query(
			`SELECT ${PLAYER_COLUMNS} FROM players WHERE lower(email) = lower($1)`,
			[email],
		);
		return rows;
	}

	// Bind the subject to a row that has none. The WHERE clause is the whole
	// safety property: a row already carrying a subject is never re-bound, so a
	// second Auth0 account presenting the same email cannot take over the first,
	// and two concurrent first-requests cannot both win.
	async function claim(playerId, subject) {
		const { rows } = await pool.query(
			`UPDATE players SET auth0_sub = $1
			 WHERE player_id = $2 AND auth0_sub IS NULL
			 RETURNING ${PLAYER_COLUMNS}`,
			[subject, playerId],
		);
		return rows[0] || null;
	}

	// Resolves the caller to exactly one player, or explains why it could not.
	// Returns { player } on success and { player: null, reason } otherwise.
	async function resolvePlayer(req) {
		const subject = getSubjectFromToken(req);
		if (!subject) {
			return { player: null, reason: UNRESOLVED.NO_SUBJECT };
		}

		const bound = await findBySubject(subject);
		if (bound) {
			return { player: bound };
		}

		// Nothing is bound to this subject yet, so this is either a first request
		// from an existing account or an account that does not exist here.
		const email = getEmailFromToken(req);
		if (!email) {
			return { player: null, reason: UNRESOLVED.NO_ACCOUNT };
		}

		if (getEmailVerifiedFromToken(req) === false) {
			return { player: null, reason: UNRESOLVED.UNVERIFIED_EMAIL };
		}

		const candidates = await findByEmail(email);
		if (candidates.length === 0) {
			return { player: null, reason: UNRESOLVED.NO_ACCOUNT };
		}
		if (candidates.length > 1) {
			// Rows that differ only by case. Guessing between them would hand one
			// player another's privileges, so refuse and let it be fixed in data.
			return { player: null, reason: UNRESOLVED.AMBIGUOUS_EMAIL };
		}

		const candidate = candidates[0];
		if (candidate.auth0_sub) {
			// The address belongs to an account already bound to a DIFFERENT
			// subject. This is the takeover attempt the binding exists to stop.
			return { player: null, reason: UNRESOLVED.NO_ACCOUNT };
		}

		const claimed = await claim(candidate.player_id, subject);
		if (claimed) {
			return { player: claimed, claimed: true };
		}

		// Lost a race with a concurrent first request. Whoever won, re-read by
		// subject: ours only if it was us.
		const afterRace = await findBySubject(subject);
		return afterRace
			? { player: afterRace }
			: { player: null, reason: UNRESOLVED.NO_ACCOUNT };
	}

	return { resolvePlayer, findBySubject, findByEmail, claim };
};

const production = createIdentity();

module.exports = {
	createIdentity,
	resolvePlayer: production.resolvePlayer,
	getEmailFromToken,
	getSubjectFromToken,
	getEmailVerifiedFromToken,
	UNRESOLVED,
};
