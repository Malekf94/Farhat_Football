const pool = require("../../db.cjs");
const queries = require("./queries.cjs");
const {
	getCaller,
	isHostAdmin,
} = require("../auth/requireHostAdmin.cjs");

// Helper reused by the join check and the account banner.
async function getPlayerBan(player_id, host_id) {
	const { rows } = await pool.query(queries.getActiveBanForPlayer, [
		player_id,
		host_id ?? null,
	]);
	return rows[0] || null;
}

// Public: active bans for a portal (so players can see who's banned).
const listBans = async (req, res) => {
	try {
		const { host_id } = req.query;
		const result = await pool.query(queries.listActiveBans, [host_id ?? null]);
		res.json(result.rows);
	} catch (error) {
		console.error("Error listing bans:", error);
		res.status(500).json({ error: "Failed to load bans." });
	}
};

// Authenticated: the caller's own active bans (across all hosts) for the
// account banner.
const myBan = async (req, res) => {
	try {
		const caller = await getCaller(req);
		if (!caller) return res.status(403).json({ error: "Could not verify identity." });
		const { rows } = await pool.query(queries.getAllActiveBansForPlayer, [
			caller.player_id,
		]);
		res.json({ bans: rows });
	} catch (error) {
		console.error("Error fetching own bans:", error);
		res.status(500).json({ error: "Failed to check ban status." });
	}
};

// Host admin: issue a ban. host_id is normalised onto the body by
// requireHostAdmin({ source: "body" }).
const issueBan = async (req, res) => {
	const { player_id, banned_until, reason } = req.body;
	const host_id = req.body.host_id;

	if (!player_id || !banned_until) {
		return res
			.status(400)
			.json({ error: "player_id and banned_until are required." });
	}
	if (new Date(banned_until) <= new Date()) {
		return res.status(400).json({ error: "banned_until must be in the future." });
	}

	try {
		const result = await pool.query(queries.createBan, [
			player_id,
			host_id,
			banned_until,
			reason || null,
			"manual",
			req.player?.player_id ?? null,
		]);
		res.status(201).json(result.rows[0]);
	} catch (error) {
		console.error("Error issuing ban:", error);
		res.status(500).json({ error: "Failed to issue ban." });
	}
};

// Host admin: lift a ban. Authorised against the ban's own host.
const liftBan = async (req, res) => {
	try {
		const caller = await getCaller(req);
		if (!caller) return res.status(403).json({ error: "Could not verify identity." });

		const banRes = await pool.query(queries.getBanById, [req.params.ban_id]);
		const ban = banRes.rows[0];
		if (!ban) return res.status(404).json({ error: "Ban not found." });

		if (!(await isHostAdmin(caller, ban.host_id))) {
			return res.status(403).json({ error: "You are not an admin of this host." });
		}

		await pool.query(queries.liftBan, [req.params.ban_id]);
		res.json({ message: "Ban lifted." });
	} catch (error) {
		console.error("Error lifting ban:", error);
		res.status(500).json({ error: "Failed to lift ban." });
	}
};

module.exports = {
	listBans,
	myBan,
	issueBan,
	liftBan,
	getPlayerBan,
};
