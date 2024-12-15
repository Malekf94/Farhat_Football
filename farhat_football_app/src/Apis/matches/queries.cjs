const getMatches = "SELECT * FROM matches";
const getMatchById = "SELECT * FROM matches WHERE match_id = $1";
const getPendingMatches = `
  SELECT * FROM matches
  WHERE match_status = 'pending'
`;

const getCompletedMatches = `
  SELECT * FROM matches
  WHERE match_status = 'completed'
`;

const getFriendlyMatches = `
  SELECT * FROM matches
  WHERE match_status = 'friendly'
`;

const getInProgressMatches = `
  SELECT * FROM matches
  WHERE match_status = 'in_progress'
`;

const getPitchPrice = `
  SELECT price 
  FROM pitches
  WHERE pitch_id = $1;
`;
const updateMatch = `
  UPDATE matches
  SET match_status = COALESCE($1, match_status),
      match_date = COALESCE($2, match_date),
      match_time = COALESCE($3, match_time),
      number_of_players = COALESCE($4, number_of_players),
      price = COALESCE($5, price),
      signin_begin_time = COALESCE($6, signin_begin_time)
  WHERE match_id = $7
  RETURNING *;
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
	getFriendlyMatches,
	getInProgressMatches,
	getPitchPrice,
	createMatch,
	updateMatch,
};
