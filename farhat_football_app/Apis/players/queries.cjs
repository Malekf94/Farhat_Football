const getPlayers = `
  SELECT player_id, first_name, last_name, preferred_name 
  FROM players;
`;
const checkEmailExists = "SELECT * FROM players WHERE email = $1";
const addPlayer = `
  INSERT INTO players (first_name, last_name, preferred_name, year_of_birth, email)
  VALUES ($1, $2, $3, $4, $5)
  RETURNING *;
`;
const addAuthPlayer = `INSERT INTO players (email, first_name, last_name, preferred_name, year_of_birth) VALUES ($1, $2, $3, $4, $5)`;
const getOwnPlayer = "SELECT * FROM players WHERE player_id = $1";
const getPlayer =
	"SELECT player_id, first_name, last_name, preferred_name, year_of_birth FROM players WHERE player_id = $1";
const getPlayerStats = `
  SELECT 
      DATE_PART('month', m.match_date) AS month,
      DATE_PART('year', m.match_date) AS year,
      COALESCE(SUM(mp.goals), 0) AS total_goals,
      COALESCE(SUM(mp.assists), 0) AS total_assists,
      COALESCE(SUM(mp.own_goals), 0) AS total_own_goals,
      COUNT(mp.match_id) AS total_matches
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
const getMonthlyPlayerStats = `
  SELECT 
      DATE_PART('month', m.match_date) AS month,
      DATE_PART('year', m.match_date) AS year,
      SUM(mp.goals) AS total_goals,
      SUM(mp.assists) AS total_assists,
      SUM(mp.own_goals) AS total_own_goals
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
  SET 
    preferred_name = COALESCE($1, preferred_name),
    year_of_birth = COALESCE($2, year_of_birth)
  WHERE player_id = $3
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
	getOwnPlayer,
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
	addAuthPlayer,
	getMonthlyPlayerStats,
};
