const getMatches = "SELECT * FROM matches";
const getMatchById = "SELECT * FROM matches WHERE match_id = $1";
const getPendingMatches =
	"SELECT * FROM matches WHERE match_status = 'pending'";
const getCompletedMatches =
	"SELECT * FROM matches WHERE match_status = 'completed'";

module.exports = {
	getMatches,
	getMatchById,
	getCompletedMatches,
	getPendingMatches,
};
