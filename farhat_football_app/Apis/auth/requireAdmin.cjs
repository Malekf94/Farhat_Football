const pool = require("../../db.cjs");

// Resolve the caller's email from the VERIFIED access token (set by checkJwt
// as req.auth.payload). The standard `email` claim is checked first; if your
// Auth0 tenant exposes email under a namespaced custom claim, set
// AUTH0_EMAIL_CLAIM to that claim name (e.g. https://farhatfootball.co.uk/email).
function getEmailFromToken(req) {
	const payload = req.auth?.payload || {};
	const claim = process.env.AUTH0_EMAIL_CLAIM;
	return (claim && payload[claim]) || payload.email || null;
}

// Authorization middleware. Must run AFTER checkJwt.
// Looks the caller up by their token email and confirms admin rights from the
// DB — the client cannot spoof this by sending an ID in the request body.
//   requireAdmin()                    -> requires is_admin
//   requireAdmin({ superadmin: true }) -> requires is_superadmin
const requireAdmin =
	(opts = {}) =>
	async (req, res, next) => {
		try {
			const email = getEmailFromToken(req);
			if (!email) {
				return res
					.status(403)
					.json({ error: "Could not verify identity from token." });
			}

			const { rows } = await pool.query(
				"SELECT player_id, is_admin, is_superadmin FROM players WHERE email = $1",
				[email],
			);
			const player = rows[0];

			const authorised = opts.superadmin
				? player?.is_superadmin
				: player?.is_admin;

			if (!authorised) {
				return res.status(403).json({ error: "Admin access required." });
			}

			// Expose the verified caller to downstream handlers.
			req.player = player;
			next();
		} catch (error) {
			console.error("requireAdmin error:", error);
			res.status(500).json({ error: "Authorization check failed." });
		}
	};

module.exports = requireAdmin;
