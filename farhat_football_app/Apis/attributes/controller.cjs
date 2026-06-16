const pool = require("../../db.cjs");
const queries = require("./queries.cjs");

const getAttributes = async (req, res) => {
	const { player_id } = req.params;

	try {
		const result = await pool.query(
			"SELECT * FROM attributes WHERE player_id = $1",
			[player_id],
		);
		if (result.rows.length > 0) {
			res.json(result.rows[0]);
		} else {
			res.status(404).json({ error: "Player attributes not found" });
		}
	} catch (error) {
		console.error("Error fetching attributes:", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

const updateAttributes = async (req, res) => {
	const { player_id } = req.params;
	const attributes = req.body;

	const keys = Object.keys(attributes);
	const values = Object.values(attributes);
	values.push(player_id);

	const query = `
        UPDATE attributes
        SET ${keys.map((key, index) => `${key} = $${index + 1}`).join(", ")}
        WHERE player_id = $${keys.length + 1}
    `;

	try {
		await pool.query(query, values);
		res.json({ message: "Attributes updated successfully." });
	} catch (error) {
		console.error("Error updating attributes:", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

let cachedAttributes = null; // cache

async function loadAttributes(db) {
	const query = `
		SELECT column_name
		FROM information_schema.columns
		WHERE table_name = 'attributes'
		  AND table_schema = 'public'
		  AND column_name NOT IN ('player_id')
		ORDER BY ordinal_position;
	`;

	const { rows } = await db.query(query);
	return rows.map((r) => r.column_name);
}

const listAttributes = async (req, res) => {
	try {
		const attributes = await loadAttributes(pool); // always queries DB
		res.json(attributes);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Database error" });
	}
};

const getLeadingAttributes = async (req, res) => {
	const { attribute } = req.params;

	const limit = 10;
	const page = Math.max(1, parseInt(req.query.page) || 1);
	const offset = (page - 1) * limit;

	try {
		const validAttributes = await loadAttributes(pool);

		// Determine the stat expression and the column to exclude zeros on
		let statExpr;
		if (attribute === "total_stats") {
			statExpr = validAttributes.map((attr) => `a.${attr}`).join(" + ");
		} else if (validAttributes.includes(attribute)) {
			statExpr = `a.${attribute}`;
		} else {
			return res.status(400).json({ error: "Invalid attribute" });
		}

		const whereClause = `WHERE (${statExpr}) > 0`;

		const countQuery = `
			SELECT COUNT(*) FROM attributes a ${whereClause}
		`;
		const countResult = await pool.query(countQuery);
		const total = parseInt(countResult.rows[0].count);

		const leaderboardQuery = `
			SELECT a.player_id, p.preferred_name, (${statExpr}) AS stat
			FROM attributes a
			JOIN players p ON a.player_id = p.player_id
			${whereClause}
			ORDER BY stat DESC
			LIMIT ${limit} OFFSET ${offset}
		`;
		const { rows } = await pool.query(leaderboardQuery);

		res.json({ data: rows, total, page, limit });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Database error" });
	}
};

module.exports = {
	getAttributes,
	updateAttributes,
	getLeadingAttributes,
	listAttributes,
};
