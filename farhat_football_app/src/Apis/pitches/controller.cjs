const pool = require("../../../db.cjs");
const queries = require("./queries.cjs");

const getPitches = (req, res) => {
	pool.query(queries.getPitches, (error, results) => {
		if (error) throw error;
		res.status(200).json(results.rows);
	});
	console.log("getting pitches");
};

const getPitchByID = (req, res) => {
	const pitch_id = parseInt(req.params.pitch_id);
	pool.query(queries.getPitchByID, [pitch_id], (error, results) => {
		if (error) throw error;
		res.status(200).json(results.rows);
	});
	console.log("getting pitch");
};

const addPitch = async (req, res) => {
	try {
		const { pitch_name, pitch_number, address, postcode, price } = req.body;

		// Validate input
		if (!pitch_name || !address || !postcode || !price) {
			return res.status(400).json({ error: "Missing required fields." });
		}

		// SQL Query
		const values = [pitch_name, pitch_number, address, postcode, price];

		// Execute the query
		const result = await pool.query(queries.addPitch, values);
		res.status(201).json(result.rows[0]); // Return the newly added pitch
	} catch (error) {
		console.error("Error adding pitch:", error);
		res.status(500).json({ error: "Internal server error." });
	}
};

module.exports = {
	getPitches,
	getPitchByID,
	addPitch,
};
