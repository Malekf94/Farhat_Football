const getPlayers = "SELECT * FROM players";
const checkEmailExists = "SELECT s FROM players s WHERE s.email = $1";
const addPlayer = `
  INSERT INTO players (first_name, last_name, preferred_name, year_of_birth, height, weight, nationality, email)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  RETURNING *;
`;
const getPlayer = "SELECT * FROM players WHERE player_id = $1";
const getPlayerStats = `
  SELECT 
      DATE_PART('month', m.match_date) AS month,
      DATE_PART('year', m.match_date) AS year,
      SUM(mp.goals) AS total_goals,
      SUM(mp.assists) AS total_assists
  FROM 
      match_players mp
  JOIN 
      matches m ON mp.match_id = m.match_id
  WHERE 
      mp.player_id = $1
  GROUP BY 
      DATE_PART('year', m.match_date), DATE_PART('month', m.match_date)
  ORDER BY 
      year, month;
`;

module.exports = {
	getPlayers,
	checkEmailExists,
	addPlayer,
	getPlayer,
	getPlayerStats,
};
