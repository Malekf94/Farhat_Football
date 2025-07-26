const { Router } = require("express");
const pool = require("../../db.cjs");
const router = Router();

// Fetch leaderboard data
router.get("/", async (req, res) => {
	const { year, startMonth, endMonth } = req.query;

	try {
		// Query for top scorers, top assisters, and man of the match
		const query = `
		      SELECT
  players.preferred_name,
  COUNT(*) AS matches_played,
  SUM(match_players.goals) AS total_goals,
  SUM(match_players.assists) AS total_assists,
  COUNT(CASE WHEN matches.man_of_the_match = players.player_id THEN 1 END) AS man_of_the_match_count,
  COUNT(CASE WHEN matches.winning_team = match_players.team_id THEN 1 END) AS wins
FROM match_players
JOIN players ON match_players.player_id = players.player_id
JOIN matches ON match_players.match_id = matches.match_id
WHERE EXTRACT(YEAR FROM matches.match_date) = $1
  AND EXTRACT(MONTH FROM matches.match_date) BETWEEN $2 AND $3
  AND matches.match_status = 'completed'
GROUP BY players.preferred_name
ORDER BY total_goals DESC, total_assists DESC, man_of_the_match_count DESC;
		    `;

		const result = await pool.query(query, [year, startMonth, endMonth]);

		res.json(result.rows);
	} catch (err) {
		console.error(err.message);
		res.status(500).json({ error: "Failed to fetch leaderboard data" });
	}
});

module.exports = router;
