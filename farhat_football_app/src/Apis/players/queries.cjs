const getPlayers = "SELECT * FROM players";
const checkEmailExists = "SELECT s FROM players s WHERE s.email = $1";
const addPlayer = `
  INSERT INTO players (first_name, last_name, preferred_name, year_of_birth, email)
  VALUES ($1, $2, $3, $4, $5)
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
const updatePlayer = `
  UPDATE players
  SET first_name = COALESCE($1, first_name),
      last_name = COALESCE($2, last_name),
      preferred_name = COALESCE($3, preferred_name),
      year_of_birth = COALESCE($4, year_of_birth),
      email = COALESCE($5, email)
  WHERE player_id = $6
  RETURNING *;
`;

const updatePlayerBalance = `
  UPDATE players
  SET account_balance = account_balance + $1
  WHERE player_id = $2
  RETURNING account_balance;
`;

const playerBalance = `SELECT account_balance FROM players WHERE player_id=$1`;

const getPayments = `SELECT * FROM payments WHERE user_id = $1 ORDER BY payment_date DESC;`;

const getAccountBalance = `SELECT account_balance FROM players WHERE player_id = $1;`;

const processPlayerPayments = `UPDATE players
             SET account_balance = account_balance + (
                 SELECT COALESCE(SUM(amount), 0) FROM payments WHERE player_id = $1
             )
             WHERE player_id = $1
             RETURNING account_balance;`;

const getNegativeBalance = `SELECT 
				player_id, 
				preferred_name AS full_name, 
				account_balance 
			FROM players 
			WHERE account_balance < 0;
		`;

module.exports = {
	getPlayers,
	checkEmailExists,
	addPlayer,
	getPlayer,
	getPlayerStats,
	updatePlayer,
	updatePlayerBalance,
	playerBalance,
	getPayments,
	getAccountBalance,
	processPlayerPayments,
	getNegativeBalance,
};
