const getMatches = "SELECT * FROM matches";
const getMatchById = "SELECT * FROM matches WHERE match_id = $1";
const getPendingMatches =
	"SELECT * FROM matches WHERE match_status = 'pending'";
const getCompletedMatches =
	"SELECT * FROM matches WHERE match_status = 'completed'";
const getPitchPrice = `
  SELECT price 
  FROM pitches
  WHERE pitch_id = $1;
`;

const createMatch = `
  INSERT INTO matches (match_date, match_time, price, number_of_players, pitch_id, match_status, signin_begin_time)
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  RETURNING *;
`;

module.exports = {
	getMatches,
	getMatchById,
	getCompletedMatches,
	getPendingMatches,
	getPitchPrice,
	createMatch,
};
