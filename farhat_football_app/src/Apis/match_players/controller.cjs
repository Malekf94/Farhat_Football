const pool = require("../../../db.cjs");
const queries = require("./queries.cjs");

const getPlayersInMatch = (req, res) => {
	const match_id = parseInt(req.params.match_id);
	pool.query(queries.getPlayersInMatch, [match_id], (error, results) => {
		if (error) throw error;
		res.status(200).json(results.rows);
	});
	console.log("getting matchplayer");
};

module.exports = {
	getPlayersInMatch,
};
