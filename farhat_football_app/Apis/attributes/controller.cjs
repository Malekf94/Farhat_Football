const pool = require("../../db.cjs");
const queries = require("./queries.cjs");

const getAttributes = async (req, res) => {
	const { player_id } = req.params;

	try {
		const result = await pool.query(
			"SELECT * FROM attributes WHERE player_id = $1",
			[player_id]
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

// controller.cjs

let cachedAttributes = null; // cache

async function loadAttributes(db) {
	if (cachedAttributes) return cachedAttributes; // already cached

	const query = `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'attributes'
    AND column_name != 'player_id'
    ORDER BY ordinal_position;
  `;
	const { rows } = await db.query(query);
	cachedAttributes = rows.map((r) => r.column_name);
	return cachedAttributes;
}

const listAttributes = async (req, res) => {
	try {
		const attributes = await loadAttributes(pool); // use pool directly
		res.json(attributes);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Database error" });
	}
};

const getLeadingAttributes = async (req, res) => {
	const { attribute } = req.params;

	try {
		const validAttributes = await loadAttributes(req.db);

		if (!validAttributes.includes(attribute)) {
			return res.status(400).json({ error: "Invalid attribute" });
		}

		const leaderboardQuery = `
      SELECT a.player_id, p.preferred_name, a.${attribute} AS stat
      FROM attributes a
      JOIN players p ON a.player_id = p.player_id
      ORDER BY a.${attribute} DESC
      LIMIT 10;
    `;
		const { rows } = await req.db.query(leaderboardQuery);

		res.json(rows);
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
