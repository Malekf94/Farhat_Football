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
      match_time = COALESCE($2, match_time),
      number_of_players = COALESCE($3, number_of_players),
      price = COALESCE($4, price),
      youtube_links = COALESCE($5, youtube_links),
      winning_team = COALESCE($6, winning_team)
  WHERE match_id = $7
  RETURNING *;
`;

const createMatch = `
  INSERT INTO matches (match_date, match_time, price, number_of_players, pitch_id, match_status, youtube_links)
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  RETURNING *;
`;

const logPayment = `
        INSERT INTO payments (user_id, amount, payment_date, transaction_id, description)
        VALUES ($1, $2, NOW(), gen_random_uuid(), $3)
    `;

const getCurrentStatus = `
SELECT match_status FROM matches WHERE match_id = $1
`;
const removeReserves = `
DELETE FROM match_players WHERE match_id = $1 AND team_id = 0
`;

const getPlayersInMatch = `
SELECT mp.player_id, mp.late, m.price
FROM match_players mp
JOIN matches m ON mp.match_id = m.match_id
WHERE mp.match_id = $1 AND mp.team_id IN (0, 1, 2)
`;

const deductPlayerBalance = `
UPDATE players SET account_balance = account_balance - $1 WHERE player_id = $2
`;

const getManOfTheMatch = `SELECT man_of_the_match FROM matches WHERE match_id = $1`;

const updateManOfTheMatch = `UPDATE matches SET man_of_the_match = $1 WHERE match_id = $2`;

const deleteMatch = `DELETE FROM matches WHERE match_id=$1`;

const getEmailsByMatch = `
    SELECT p.email 
    FROM players p
    JOIN match_players mp ON p.player_id = mp.player_id
    WHERE mp.match_id = $1
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
	logPayment,
	getCurrentStatus,
	removeReserves,
	getPlayersInMatch,
	deductPlayerBalance,
	getManOfTheMatch,
	updateManOfTheMatch,
	deleteMatch,
	getEmailsByMatch,
};
