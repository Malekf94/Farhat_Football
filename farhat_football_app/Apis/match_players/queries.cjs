const getPlayersInMatch =
	"SELECT p.player_id, p.first_name, p.last_name, p.preferred_name, p.year_of_birth, mp.goals, mp.assists, mp.defcons, mp.chancescreated, mp.own_goals, mp.late, mp.price, mp.team_id, mp.joined_at, mp.rating FROM match_players mp JOIN players p ON mp.player_id = p.player_id WHERE mp.match_id = $1";

const addPlayerToMatch = `
	INSERT INTO match_players (match_id, player_id, goals, assists, defcons, chancescreated, own_goals, late, price, team_id)
	VALUES ($1, $2, 0, 0, 0, 0, 0, FALSE, $3, 0)
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
      defcons = COALESCE($3, defcons),
      chancescreated = COALESCE($4, chancescreated),
      own_goals = COALESCE($5, own_goals),
      late = COALESCE($6, late),
      team_id = COALESCE($7, team_id),
      rating = COALESCE($8, rating)
  WHERE match_id = $9 AND player_id = $10
  RETURNING *;
`;

const getMatchPlayers = `
  SELECT player_id, late
  FROM match_players
  WHERE match_id = $1
`;

const getLates = `SELECT
  mp.match_id,
  m.match_date,
  CONCAT(p.first_name, ' ', p.last_name) AS full_name
FROM match_players mp
JOIN matches m ON mp.match_id = m.match_id
JOIN players p ON mp.player_id = p.player_id
WHERE mp.late = true
  AND EXTRACT(YEAR FROM m.match_date) = 2026
  AND ($1::int IS NULL OR m.host_id = $1)
ORDER BY m.match_date ASC;
`;
// `
//   SELECT
//     mp.match_id,
//     m.match_date,
//     CONCAT(p.first_name, ' ', p.last_name) AS full_name
//   FROM match_players mp
//   JOIN matches m ON mp.match_id = m.match_id
//   JOIN players p ON mp.player_id = p.player_id
//   WHERE mp.late = true
//   ORDER BY m.match_date ASC;
// `;
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
LEFT JOIN
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

// ---- Player-voted ratings ----
const getMatchStatus = `SELECT match_status FROM matches WHERE match_id = $1;`;

const playedInMatch = `
  SELECT 1 FROM match_players
  WHERE match_id = $1 AND player_id = $2 AND team_id IN (1, 2)
  LIMIT 1;
`;

const upsertRating = `
  INSERT INTO match_player_ratings (match_id, rater_id, ratee_id, rating)
  VALUES ($1, $2, $3, $4)
  ON CONFLICT (match_id, rater_id, ratee_id)
  DO UPDATE SET rating = EXCLUDED.rating, created_at = now();
`;

const getMyRatings = `
  SELECT ratee_id, rating
  FROM match_player_ratings
  WHERE match_id = $1 AND rater_id = $2;
`;

// Suggested (average) rating per player from all votes for a match.
const getSuggestedRatings = `
  SELECT ratee_id, ROUND(AVG(rating), 1) AS suggested, COUNT(*) AS votes
  FROM match_player_ratings
  WHERE match_id = $1
  GROUP BY ratee_id;
`;

module.exports = {
	getMatchStatus,
	playedInMatch,
	upsertRating,
	getMyRatings,
	getSuggestedRatings,
	getPlayersInMatch,
	addPlayerToMatch,
	removePlayerFromMatch,
	updateMatchPlayer,
	getMatchPlayers,
	getLates,
	removeAllPlayerFromMatch,
	getPlayerAttributesInMatch,
	updateTeamAssignments,
};
