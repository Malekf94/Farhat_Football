const pool = require("../../db.cjs");

// Resolve the caller's email from the VERIFIED access token (set by checkJwt).
// Standard `email` claim first; falls back to a namespaced custom claim named
// by AUTH0_EMAIL_CLAIM (same mechanism as requireAdmin).
function getEmailFromToken(req) {
	const payload = req.auth?.payload || {};
	const claim = process.env.AUTH0_EMAIL_CLAIM;
	return (claim && payload[claim]) || payload.email || null;
}

// Authorization middleware. Must run AFTER checkJwt.
// Allows the request only if the caller (identified from their token) owns the
// :player_id in the URL, or is an admin. Prevents one logged-in player from
// reading/editing another player's account via the ID in the URL.
const requireSelfOrAdmin = async (req, res, next) => {
	try {
		const email = getEmailFromToken(req);
		if (!email) {
			return res
				.status(403)
				.json({ error: "Could not verify identity from token." });
		}

		const { rows } = await pool.query(
			"SELECT player_id, is_admin FROM players WHERE email = $1",
			[email],
		);
		const caller = rows[0];
		if (!caller) {
			return res.status(403).json({ error: "Caller not recognised." });
		}

		const targetId = parseInt(req.params.player_id, 10);
		if (caller.player_id === targetId || caller.is_admin) {
			req.player = caller;
			return next();
		}

		return res
			.status(403)
			.json({ error: "You can only access your own account." });
	} catch (error) {
		console.error("requireSelfOrAdmin error:", error);
		res.status(500).json({ error: "Authorization check failed." });
	}
};

module.exports = requireSelfOrAdmin;
