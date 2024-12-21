const getPlayersInMatch =
	"SELECT p.player_id, p.first_name, p.last_name, p.preferred_name, p.year_of_birth, mp.goals, mp.assists, mp.late, mp.price, mp.team_id FROM match_players mp JOIN players p ON mp.player_id = p.player_id WHERE mp.match_id = $1";

const addPlayerToMatch = `
	INSERT INTO match_players (match_id, player_id, goals, assists, late, price, team_id)
	VALUES ($1, $2, 0, 0, FALSE, $3, 1)
	RETURNING *;
  `;

const removePlayerFromMatch = `
	DELETE FROM match_players
	WHERE match_id = $1 AND player_id = $2
	RETURNING *;
  `;
const updateMatchPlayer = `
  UPDATE match_players
  SET goals = COALESCE($1, goals),
      assists = COALESCE($2, assists),
      late = COALESCE($3, late)
  WHERE match_id = $4 AND player_id = $5
  RETURNING *;
`;

const getMatchPlayers = `
  SELECT player_id, late
  FROM match_players
  WHERE match_id = $1
`;

const updatePlayerBalance = `
  UPDATE players
  SET account_balance = account_balance + $1
  WHERE player_id = $2
  RETURNING *;
`;
const getLates = `
  SELECT 
    mp.match_id,
    m.match_date,
    CONCAT(p.first_name, ' ', p.last_name) AS full_name
  FROM match_players mp
  JOIN matches m ON mp.match_id = m.match_id
  JOIN players p ON mp.player_id = p.player_id
  WHERE mp.late = true
  ORDER BY m.match_date ASC;
`;
module.exports = {
	getPlayersInMatch,
	addPlayerToMatch,
	removePlayerFromMatch,
	updateMatchPlayer,
	getMatchPlayers,
	updatePlayerBalance,
	getLates,
};
