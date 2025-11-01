const { Router } = require("express");
const pool = require("../../db.cjs");
const router = Router();

// Fetch leaderboard data
router.get("/", async (req, res) => {
	const { year, month } = req.query;

	try {
		// Query for top scorers, top assisters, and man of the match
		const query = `
		 SELECT
  p.preferred_name,
  COUNT(*) AS matches_played,
  SUM(mp.goals) AS total_goals,
  SUM(mp.assists) AS total_assists,
  SUM(mp.defcons) AS total_defcons,
  COUNT(CASE WHEN m.man_of_the_match = mp.player_id THEN 1 END) AS man_of_the_match_count,
  COUNT(CASE WHEN m.winning_team = mp.team_id THEN 1 END) AS wins
FROM match_players mp
JOIN players p ON mp.player_id = p.player_id
JOIN matches m ON mp.match_id = m.match_id
WHERE EXTRACT(YEAR FROM m.match_date) = $1
  AND EXTRACT(MONTH FROM m.match_date) = $2
  AND m.match_status = 'completed'
GROUP BY p.preferred_name
ORDER BY total_goals DESC, total_assists DESC, total_defcons DESC, man_of_the_match_count DESC;
		`;

		const result = await pool.query(query, [year, month]);
		res.json(result.rows);
	} catch (err) {
		console.error(err.message);
		res.status(500).json({ error: "Failed to fetch leaderboard data" });
	}
});

module.exports = router;
