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
    SELECT 
      p.preferred_name,
      SUM(mp.goals) AS total_goals,
      SUM(mp.assists) AS total_assists,
      COUNT(*) AS matches_played,
      COUNT(CASE 
        WHEN mp.team_id = tg.winning_team_id THEN 1 
      END) AS wins,
      COUNT(CASE 
        WHEN m.man_of_the_match = p.player_id THEN 1 
      END) AS man_of_the_match_count
    FROM match_players mp
    JOIN players p ON mp.player_id = p.player_id
    JOIN matches m ON mp.match_id = m.match_id
    LEFT JOIN (
      SELECT match_id,
        MAX(team_id) FILTER (WHERE team_goals = max_goals) AS winning_team_id
      FROM (
        SELECT 
          match_id, 
          team_id, 
          SUM(goals) AS team_goals,
          MAX(SUM(goals)) OVER (PARTITION BY match_id) AS max_goals
        FROM match_players
        GROUP BY match_id, team_id
      ) sub
      GROUP BY match_id
    ) tg ON mp.match_id = tg.match_id
    WHERE EXTRACT(YEAR FROM m.match_date) = $1
      AND EXTRACT(MONTH FROM m.match_date) = $2
      AND m.match_status = 'completed'
    GROUP BY p.preferred_name, p.player_id
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
