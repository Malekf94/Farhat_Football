const defaultPool = require("../../db.cjs");

// Resolve the caller's email from the VERIFIED access token (same mechanism as
// requireAdmin — standard `email` claim, or the namespaced AUTH0_EMAIL_CLAIM).
function getEmailFromToken(req) {
	const payload = req.auth?.payload || {};
	const claim = process.env.AUTH0_EMAIL_CLAIM;
	return (claim && payload[claim]) || payload.email || null;
}

// Builds the host-scoped authorization helpers over a given pool. Tests pass a
// fake one — a .cjs module's require() cannot be intercepted by vi.mock(), so
// injection is the only way to unit test the branches that query (TEST-002).
//
// The default-host id is cached per instance rather than at module scope, so a
// fake pool in one test cannot leak its answer into the next.
const createHostAdminAuth = (pool = defaultPool) => {
	// The "default" host is your original site (Farhat Football). Global admins
	// (is_admin) manage the default host for backward compatibility; other hosts
	// are managed only by their explicit host_admins.
	const DEFAULT_HOST_SLUG = process.env.DEFAULT_HOST_SLUG || "farhat";
	let cachedDefaultHostId;

	async function getDefaultHostId() {
		if (cachedDefaultHostId !== undefined) return cachedDefaultHostId;
		const { rows } = await pool.query(
			"SELECT host_id FROM hosts WHERE slug = $1",
			[DEFAULT_HOST_SLUG],
		);
		cachedDefaultHostId = rows[0]?.host_id ?? null;
		return cachedDefaultHostId;
	}

	async function getCaller(req) {
		const email = getEmailFromToken(req);
		if (!email) return null;
		const { rows } = await pool.query(
			"SELECT player_id, is_admin, is_superadmin FROM players WHERE email = $1",
			[email],
		);
		return rows[0] || null;
	}

	// Is this caller allowed to administer the given host?
	//   superadmin              -> any host
	//   global is_admin         -> the default host only
	//   listed in host_admins   -> that host
	async function isHostAdmin(caller, hostId) {
		if (!caller) return false;
		if (caller.is_superadmin) return true;

		const defaultHostId = await getDefaultHostId();
		if (caller.is_admin && hostId != null && hostId === defaultHostId) {
			return true;
		}
		if (hostId == null) return false;

		const { rows } = await pool.query(
			"SELECT 1 FROM host_admins WHERE host_id = $1 AND player_id = $2",
			[hostId, caller.player_id],
		);
		return rows.length > 0;
	}

	// Authorization middleware factory. Must run AFTER checkJwt.
	//   requireHostAdmin()                 -> host derived from req.params.match_id
	//   requireHostAdmin({ source: "body" }) -> host from req.body.host_id
	//                                           (defaults to the default host)
	const requireHostAdmin =
		({ source = "match" } = {}) =>
		async (req, res, next) => {
			try {
				const caller = await getCaller(req);
				if (!caller) {
					return res
						.status(403)
						.json({ error: "Could not verify identity from token." });
				}

				let hostId;
				if (source === "body") {
					hostId =
						req.body.host_id != null
							? Number(req.body.host_id)
							: await getDefaultHostId();
					req.body.host_id = hostId; // normalise for the controller
				} else {
					const { rows } = await pool.query(
						"SELECT host_id FROM matches WHERE match_id = $1",
						[req.params.match_id],
					);
					if (rows.length === 0) {
						return res.status(404).json({ error: "Match not found." });
					}
					hostId = rows[0].host_id;
				}

				if (await isHostAdmin(caller, hostId)) {
					req.player = caller;
					req.hostId = hostId;
					return next();
				}
				return res
					.status(403)
					.json({ error: "You are not an admin of this host." });
			} catch (error) {
				console.error("requireHostAdmin error:", error);
				res.status(500).json({ error: "Authorization check failed." });
			}
		};

	return { requireHostAdmin, getDefaultHostId, getCaller, isHostAdmin };
};

const production = createHostAdminAuth();

module.exports = production.requireHostAdmin;
module.exports.getDefaultHostId = production.getDefaultHostId;
module.exports.isHostAdmin = production.isHostAdmin;
module.exports.getCaller = production.getCaller;
module.exports.createHostAdminAuth = createHostAdminAuth;
module.exports.getEmailFromToken = getEmailFromToken;
