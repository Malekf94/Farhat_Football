const getPlayersInMatch =
	"SELECT p.player_id, p.first_name, p.last_name, p.preferred_name, p.year_of_birth, mp.goals, mp.assists, mp.own_goals, mp.late, mp.price, mp.team_id, mp.joined_at FROM match_players mp JOIN players p ON mp.player_id = p.player_id WHERE mp.match_id = $1";

const addPlayerToMatch = `
	INSERT INTO match_players (match_id, player_id, goals, assists, own_goals, late, price, team_id)
	VALUES ($1, $2, 0, 0, 0, FALSE, $3, 0)
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
      own_goals = COALESCE($3, own_goals),
      late = COALESCE($4, late),
      team_id = COALESCE($5, team_id)
  WHERE match_id = $6 AND player_id = $7
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
const removeAllPlayerFromMatch =
	"DELETE FROM match_players WHERE match_id = $1";

const getPlayerAttributesInMatch = `
SELECT 
    p.player_id,
    p.first_name,
    p.last_name,
    p.preferred_name,
    mp.team_id,
    a.*
FROM 
    match_players mp
JOIN 
    players p ON mp.player_id = p.player_id
JOIN 
    attributes a ON p.player_id = a.player_id
WHERE 
    mp.match_id = $1
    AND mp.team_id IN (1, 2);

`;

const updateTeamAssignments = `
        UPDATE match_players
    SET team_id = CASE
        WHEN player_id = ANY($1::int[]) THEN 1
        WHEN player_id = ANY($2::int[]) THEN 2
    END
    WHERE match_id = $3
    AND (player_id = ANY($1::int[]) OR player_id = ANY($2::int[]));
`;

module.exports = {
	getPlayersInMatch,
	addPlayerToMatch,
	removePlayerFromMatch,
	updateMatchPlayer,
	getMatchPlayers,
	updatePlayerBalance,
	getLates,
	removeAllPlayerFromMatch,
	getPlayerAttributesInMatch,
	updateTeamAssignments,
};
