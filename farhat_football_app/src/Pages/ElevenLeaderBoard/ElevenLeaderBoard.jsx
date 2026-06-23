import { useState, useEffect } from "react";
import { publicApi } from "../../api";
import "../LeaderBoard/LeaderBoard.css";

function ElevenLeaderBoard() {
	const [year, setYear] = useState(""); // "" = all time
	const [leaderboardData, setLeaderboardData] = useState([]);
	const [sortKey, setSortKey] = useState("total_goals");

	const sortData = (data, key) => [...data].sort((a, b) => b[key] - a[key]);

	useEffect(() => {
		publicApi
			.get("/api/v1/eleven-aside-leaderboard", {
				params: year ? { year } : {},
			})
			.then((response) => {
				setLeaderboardData(sortData(response.data, sortKey));
			})
			.catch((error) => {
				console.error("Error fetching 11-a-side leaderboard data:", error);
			});
	}, [year, sortKey]);

	const handleSortChange = (e) => {
		const newSortKey = e.target.value;
		setSortKey(newSortKey);
		setLeaderboardData(sortData(leaderboardData, newSortKey));
	};

	const currentYear = new Date().getFullYear();
	const years = Array.from({ length: currentYear - 2024 }, (_, i) => 2025 + i);

	return (
		<div className="page-content leaderboard">
			<h1>11-a-side Leaderboard</h1>
			<div className="lb-filters">
				<label>
					Year:
					<select value={year} onChange={(e) => setYear(e.target.value)}>
						<option value="">All time</option>
						{years.map((y) => (
							<option key={y} value={y}>
								{y}
							</option>
						))}
					</select>
				</label>
				<label>
					Sort By:
					<select value={sortKey} onChange={handleSortChange}>
						<option value="total_goals">Goals</option>
						<option value="total_assists">Assists</option>
						<option value="total_defcons">Defcons</option>
						<option value="total_chancescreated">Key Passes</option>
						<option value="matches_played">Matches Played</option>
						<option value="wins">Wins</option>
						<option value="man_of_the_match_count">Man of the Match</option>
					</select>
				</label>
			</div>
			<table className="leaderboard-table">
				<thead>
					<tr>
						<th>Player</th>
						<th>Total Goals</th>
						<th>Total Assists</th>
						<th>Total Defcons</th>
						<th>Total Key Passes</th>
						<th>Matches Played</th>
						<th>Wins</th>
						<th>Man of the Match Wins</th>
					</tr>
				</thead>
				<tbody>
					{leaderboardData.map((player, index) => (
						<tr key={index}>
							<td>{player.preferred_name}</td>
							<td>{player.total_goals}</td>
							<td>{player.total_assists}</td>
							<td>{player.total_defcons}</td>
							<td>{player.total_chancescreated}</td>
							<td>{player.matches_played}</td>
							<td>{player.wins}</td>
							<td>{player.man_of_the_match_count}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export default ElevenLeaderBoard;
