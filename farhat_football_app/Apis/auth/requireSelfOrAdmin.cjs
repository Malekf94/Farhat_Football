const { createIdentity } = require("./identity.cjs");

// Authorization middleware. Must run AFTER checkJwt.
// Allows the request only if the caller owns the :player_id in the URL, or is
// an admin. Prevents one logged-in player from reading/editing another
// player's account via the ID in the URL.
//
// The caller is resolved from the immutable Auth0 subject (AUTH-001), so
// ownership does not move when an email address does.
const createRequireSelfOrAdmin = (pool) => {
	const { resolvePlayer } = createIdentity(pool);

	return async (req, res, next) => {
		try {
			const { player: caller } = await resolvePlayer(req);
			if (!caller) {
				return res
					.status(403)
					.json({ error: "Could not verify identity from token." });
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
};

module.exports = createRequireSelfOrAdmin();
module.exports.createRequireSelfOrAdmin = createRequireSelfOrAdmin;
