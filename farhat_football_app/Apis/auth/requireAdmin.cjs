const { createIdentity, UNRESOLVED } = require("./identity.cjs");

// Authorization middleware. Must run AFTER checkJwt.
//
// Identity comes from the immutable Auth0 subject via the shared resolver, so a
// change of email address in Auth0 cannot move or lose a player's privileges
// (AUTH-001). Admin flags are read from that player's DB row — the client
// cannot spoof them by sending an ID or a flag in the request body.
//
//   requireAdmin()                    -> requires is_admin
//   requireAdmin({ superadmin: true }) -> requires is_superadmin
//
// createRequireAdmin takes the pool so tests can supply a fake one; a .cjs
// module's require() cannot be intercepted by vi.mock(), so injection is the
// only way to unit test the branches that query (TEST-002).
const createRequireAdmin = (pool) => {
	const { resolvePlayer } = createIdentity(pool);

	return (opts = {}) =>
		async (req, res, next) => {
			try {
				const { player, reason } = await resolvePlayer(req);

				if (!player) {
					// An account that cannot be identified at all, one whose email the
					// tenant reports as unverified, and one whose address matches more
					// than one row are each refused for their own reason. Anything
					// else is reported as a plain lack of admin rights, so the response
					// does not disclose whether an account exists.
					if (reason === UNRESOLVED.NO_SUBJECT) {
						return res
							.status(403)
							.json({ error: "Could not verify identity from token." });
					}
					if (reason === UNRESOLVED.UNVERIFIED_EMAIL) {
						return res
							.status(403)
							.json({ error: "Email address is not verified." });
					}
					if (reason === UNRESOLVED.AMBIGUOUS_EMAIL) {
						return res
							.status(403)
							.json({ error: "Account could not be identified uniquely." });
					}
					return res.status(403).json({ error: "Admin access required." });
				}

				const authorised = opts.superadmin
					? player.is_superadmin
					: player.is_admin;

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
};

const requireAdmin = createRequireAdmin();

module.exports = requireAdmin;
module.exports.createRequireAdmin = createRequireAdmin;
