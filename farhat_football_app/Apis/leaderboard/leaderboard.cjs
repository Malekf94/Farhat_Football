const { Router } = require("express");
const pool = require("../../db.cjs");
const router = Router();

// Fetch leaderboard data
router.get("/", async (req, res) => {
	const { year, month } = req.query;

	try {
		// Query for top scorers, top assisters, and man of the match
		// const query = `
		//   SELECT
		//     p.preferred_name,
		//     SUM(mp.goals) AS total_goals,
		//     SUM(mp.assists) AS total_assists,
		//     COUNT(CASE WHEN m.man_of_the_match = mp.player_id THEN 1 END) AS man_of_the_match_count
		//     FROM match_players mp
		//     JOIN players p ON mp.player_id = p.player_id
		//     JOIN matches m ON mp.match_id = m.match_id
		//     WHERE EXTRACT(YEAR FROM m.match_date) = $1
		//     AND EXTRACT(MONTH FROM m.match_date) = $2
		//     AND m.match_status = 'completed'
		//     GROUP BY p.preferred_name
		//     ORDER BY total_goals DESC, total_assists DESC;
		// `;
		const query = `
    WITH team_goals AS (
  SELECT 
    match_id,
    team_id,
    SUM(goals) AS team_goals
  FROM match_players
  GROUP BY match_id, team_id
),
winning_teams AS (
  SELECT
    tg1.match_id,
    CASE 
      WHEN tg1.team_goals > tg2.team_goals THEN tg1.team_id
      WHEN tg2.team_goals > tg1.team_goals THEN tg2.team_id
      ELSE NULL
    END AS winning_team_id
  FROM team_goals tg1
  JOIN team_goals tg2 
    ON tg1.match_id = tg2.match_id AND tg1.team_id != tg2.team_id
)
SELECT
  p.preferred_name,
  SUM(mp.goals) AS total_goals,
  SUM(mp.assists) AS total_assists,
  COUNT(*) AS matches_played,
  COUNT(CASE WHEN wt.winning_team_id IS NOT NULL AND wt.winning_team_id = mp.team_id THEN 1 END) AS wins,
  COUNT(CASE WHEN m.man_of_the_match = mp.player_id THEN 1 END) AS man_of_the_match_count
FROM match_players mp
JOIN players p ON mp.player_id = p.player_id
JOIN matches m ON mp.match_id = m.match_id
LEFT JOIN winning_teams wt ON mp.match_id = wt.match_id
WHERE EXTRACT(YEAR FROM m.match_date) = $1
  AND EXTRACT(MONTH FROM m.match_date) = $2
  AND m.match_status = 'completed'
GROUP BY p.player_id, p.preferred_name
ORDER BY total_goals DESC, total_assists DESC;

  `;

		const result = await pool.query(query, [year, month]);
		res.json(result.rows);
	} catch (err) {
		console.error(err.message);
		res.status(500).json({ error: "Failed to fetch leaderboard data" });
	}
});

module.exports = router;
