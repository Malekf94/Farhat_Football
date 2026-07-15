const pool = require("../../db.cjs");
const queries = require("./queries.cjs");
const { getCaller } = require("../auth/requireHostAdmin.cjs");

// Public: resolve a slug to a host (used by the frontend to establish portal context)
const getHostBySlug = async (req, res) => {
	try {
		const result = await pool.query(queries.getHostBySlug, [req.params.slug]);
		if (result.rows.length === 0) {
			return res.status(404).json({ error: "Host not found." });
		}
		res.json(result.rows[0]);
	} catch (error) {
		console.error("Error fetching host:", error);
		res.status(500).json({ error: "Failed to fetch host." });
	}
};

// Authenticated: hosts the caller can administer (for portal switching).
const getMyHosts = async (req, res) => {
	try {
		const caller = await getCaller(req);
		if (!caller) {
			return res.status(403).json({ error: "Could not verify identity." });
		}

		// Superadmins can administer every host.
		if (caller.is_superadmin) {
			const all = await pool.query("SELECT * FROM hosts ORDER BY name");
			return res.json(all.rows);
		}

		const mine = await pool.query(queries.getMyHosts, [caller.player_id]);
		const hosts = mine.rows;

		// Global admins also administer the default host.
		if (caller.is_admin) {
			const slug = process.env.DEFAULT_HOST_SLUG || "farhat";
			const def = await pool.query(queries.getHostBySlug, [slug]);
			if (
				def.rows.length > 0 &&
				!hosts.some((h) => h.host_id === def.rows[0].host_id)
			) {
				hosts.push(def.rows[0]);
			}
		}

		res.json(hosts);
	} catch (error) {
		console.error("Error fetching my hosts:", error);
		res.status(500).json({ error: "Failed to fetch hosts." });
	}
};

// Superadmin: list all hosts with their admin counts.
const listHosts = async (req, res) => {
	try {
		const result = await pool.query(queries.listHosts);
		res.json(result.rows);
	} catch (error) {
		console.error("Error listing hosts:", error);
		res.status(500).json({ error: "Failed to list hosts." });
	}
};

// Superadmin: create a host.
const createHost = async (req, res) => {
	const { name, slug } = req.body;
	if (!name || !slug) {
		return res.status(400).json({ error: "name and slug are required." });
	}
	// Slug must be URL-safe (lowercase letters, numbers, hyphens).
	if (!/^[a-z0-9-]+$/.test(slug)) {
		return res.status(400).json({
			error: "slug may only contain lowercase letters, numbers, and hyphens.",
		});
	}
	try {
		const result = await pool.query(queries.createHost, [name, slug]);
		res.status(201).json(result.rows[0]);
	} catch (error) {
		if (error.code === "23505") {
			return res.status(409).json({ error: "That slug is already taken." });
		}
		console.error("Error creating host:", error);
		res.status(500).json({ error: "Failed to create host." });
	}
};

// Superadmin: list a host's admins.
const getHostAdmins = async (req, res) => {
	try {
		const result = await pool.query(queries.getHostAdmins, [
			req.params.host_id,
		]);
		res.json(result.rows);
	} catch (error) {
		console.error("Error fetching host admins:", error);
		res.status(500).json({ error: "Failed to fetch host admins." });
	}
};

// Superadmin: add an admin to a host (by player_id or email).
const addHostAdmin = async (req, res) => {
	const { host_id } = req.params;
	let { player_id, email } = req.body;

	try {
		if (!player_id && email) {
			const lookup = await pool.query(queries.getPlayerByEmail, [email]);
			if (lookup.rows.length === 0) {
				return res
					.status(404)
					.json({ error: "No player found with that email." });
			}
			player_id = lookup.rows[0].player_id;
		}
		if (!player_id) {
			return res.status(400).json({ error: "player_id or email is required." });
		}

		await pool.query(queries.addHostAdmin, [host_id, player_id]);
		res.status(201).json({ message: "Host admin added.", player_id });
	} catch (error) {
		console.error("Error adding host admin:", error);
		res.status(500).json({ error: "Failed to add host admin." });
	}
};

// Superadmin: remove an admin from a host.
const removeHostAdmin = async (req, res) => {
	const { host_id, player_id } = req.params;
	try {
		await pool.query(queries.removeHostAdmin, [host_id, player_id]);
		res.json({ message: "Host admin removed." });
	} catch (error) {
		console.error("Error removing host admin:", error);
		res.status(500).json({ error: "Failed to remove host admin." });
	}
};

module.exports = {
	getHostBySlug,
	getMyHosts,
	listHosts,
	createHost,
	getHostAdmins,
	addHostAdmin,
	removeHostAdmin,
};
