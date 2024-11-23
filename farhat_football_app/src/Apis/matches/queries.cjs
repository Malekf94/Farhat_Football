const getMatches = "SELECT * FROM matches";
const getMatchById = "SELECT * FROM matches WHERE matchid = $1";

module.exports = {
	getMatches,
	getMatchById,
};
