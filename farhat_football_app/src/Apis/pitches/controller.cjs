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

module.exports = {
	getPitches,
	getPitchByID,
};
