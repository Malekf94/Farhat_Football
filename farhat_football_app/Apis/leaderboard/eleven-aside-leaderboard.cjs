const { Router } = require("express");
const pool = require("../../db.cjs");
const router = Router();

// Fetch 11-a-side leaderboard data.
// Counts only completed games where number_of_players = 11.
// Optional ?year= filter; omit for all-time.
router.get("/", async (req, res) => {
	const { year, host_id } = req.query;

	try {
		const values = [];
		const conds = [
			"m.match_status = 'completed'",
			"m.number_of_players = 11",
		];

		if (host_id) {
			values.push(host_id);
			conds.push(`m.host_id = $${values.length}`);
		}
		if (year) {
			values.push(year);
			conds.push(`EXTRACT(YEAR FROM m.match_date) = $${values.length}`);
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
				COUNT(CASE WHEN m.winning_team = mp.team_id THEN 1 END) AS wins,
				CASE WHEN COUNT(mp.rating) >= 3 THEN ROUND(AVG(mp.rating), 2) ELSE NULL END AS avg_rating
			FROM match_players mp
			JOIN players p ON mp.player_id = p.player_id
			JOIN matches m ON mp.match_id = m.match_id
			WHERE ${conds.join(" AND ")}
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
