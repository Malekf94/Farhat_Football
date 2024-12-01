const pool = require("../../../db.cjs");
const queries = require("./queries.cjs");

const getMatches = (req, res) => {
	pool.query(queries.getMatches, (error, results) => {
		if (error) throw error;
		res.status(200).json(results.rows);
	});
	console.log("getting matches");
};

const getMatchById = (req, res) => {
	const match_id = parseInt(req.params.match_id);
	pool.query(queries.getMatchById, [match_id], (error, results) => {
		if (error) throw error;
		res.status(200).json(results.rows);
	});
	console.log("getting match");
};

const createMatch = (req, res) => {
	const {} = req.body;
};

module.exports = {
	getMatches,
	getMatchById,
	createMatch,
};
