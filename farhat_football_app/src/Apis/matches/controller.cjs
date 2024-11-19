const pool = require("../../../db.cjs");

const getMatches = (req, res) => {
	pool.query("SELECT * FROM matches", (error, results) => {
		if (error) throw error;
		res.status(200).json(results.rows);
	});
	console.log("getting matches");
};

module.exports = {
	getMatches,
};
