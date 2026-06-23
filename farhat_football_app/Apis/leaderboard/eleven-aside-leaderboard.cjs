const { Router } = require("express");
const pool = require("../../db.cjs");
const router = Router();

// Fetch 11-a-side leaderboard data.
// Counts only completed games where number_of_players = 11.
// Optional ?year= filter; omit for all-time.
router.get("/", async (req, res) => {
	const { year } = req.query;

	try {
		const values = [];
		let yearFilter = "";
		if (year) {
			values.push(year);
			yearFilter = `AND EXTRACT(YEAR FROM m.match_date) = $1`;
		}

		const query = `
			SELECT
				p.preferred_name,
				COUNT(*) AS matches_played,
				SUM(mp.goals) AS total_goals,
				SUM(mp.assists) AS total_assists,
				SUM(mp.defcons) AS total_defcons,
				SUM(mp.chancescreated) AS total_chancescreated,
				COUNT(CASE WHEN m.man_of_the_match = mp.player_id THEN 1 END) AS man_of_the_match_count,
				COUNT(CASE WHEN m.winning_team = mp.team_id THEN 1 END) AS wins
			FROM match_players mp
			JOIN players p ON mp.player_id = p.player_id
			JOIN matches m ON mp.match_id = m.match_id
			WHERE m.match_status = 'completed'
				AND m.number_of_players = 11
				${yearFilter}
			GROUP BY p.preferred_name
			ORDER BY total_goals DESC, total_assists DESC, total_defcons DESC, total_chancescreated DESC, man_of_the_match_count DESC;
		`;

		const result = await pool.query(query, values);
		res.json(result.rows);
	} catch (err) {
		console.error(err.message);
		res.status(500).json({ error: "Failed to fetch 11-a-side leaderboard data" });
	}
});

module.exports = router;
