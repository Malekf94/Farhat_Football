const pool = require("../../db.cjs");
const { getCaller, isHostAdmin } = require("./requireHostAdmin.cjs");

// Authorization middleware for roster mutations. Must run AFTER checkJwt.
//
// These routes carry match_id and player_id in the BODY, so neither
// requireHostAdmin() (host from req.params.match_id) nor
// requireHostAdmin({ source: "body" }) (host from req.body.host_id) fits.
//
// A caller may act on themselves. Acting on anyone else requires admin rights
// over the host that owns the match, resolved the same way as every other
// host-scoped route: superadmin anywhere, global is_admin on the default host
// only, otherwise an explicit host_admins row.
//
// The validated target is exposed as req.targetPlayerId. Controllers must use
// that rather than req.body.player_id, so an id from the request body never
// reaches a query unchecked.
const requireSelfOrHostAdmin = async (req, res, next) => {
	try {
		const targetPlayerId = Number.parseInt(req.body?.player_id, 10);
		if (!Number.isInteger(targetPlayerId)) {
			return res.status(400).json({ error: "player_id is required." });
		}

		const caller = await getCaller(req);
		if (!caller) {
			return res
				.status(403)
				.json({ error: "Could not verify identity from token." });
		}

		if (caller.player_id === targetPlayerId) {
			req.player = caller;
			req.targetPlayerId = targetPlayerId;
			return next();
		}

		const matchId = Number.parseInt(req.body?.match_id, 10);
		if (!Number.isInteger(matchId)) {
			return res.status(400).json({ error: "match_id is required." });
		}

		const { rows } = await pool.query(
			"SELECT host_id FROM matches WHERE match_id = $1",
			[matchId],
		);
		if (rows.length === 0) {
			return res.status(404).json({ error: "Match not found." });
		}

		if (await isHostAdmin(caller, rows[0].host_id)) {
			req.player = caller;
			req.hostId = rows[0].host_id;
			req.targetPlayerId = targetPlayerId;
			return next();
		}

		return res
			.status(403)
			.json({ error: "You can only change your own place in a match." });
	} catch (error) {
		console.error("requireSelfOrHostAdmin error:", error);
		res.status(500).json({ error: "Authorization check failed." });
	}
};

module.exports = requireSelfOrHostAdmin;
