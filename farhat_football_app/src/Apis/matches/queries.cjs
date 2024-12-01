const getMatches = "SELECT * FROM matches";
const getMatchById = "SELECT * FROM matches WHERE match_id = $1";

module.exports = {
	getMatches,
	getMatchById,
};
