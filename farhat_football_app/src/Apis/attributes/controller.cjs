const pool = require("../../../db.cjs");
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

module.exports = { getAttributes, updateAttributes };
