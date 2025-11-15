import { useState, useEffect } from "react";
import axios from "axios";
import "./SeasonalLeaderBoard.css";

function SeasonalLeaderBoard() {
	const [year, setYear] = useState(new Date().getFullYear());
	const [season, setSeason] = useState(4); // Default to Season 1
	const [leaderboardData, setLeaderboardData] = useState([]);
	const [sortKey, setSortKey] = useState("goals"); // Default sort by goals

	const fetchSeasonalLeaderboard = () => {
		let startMonth = (season - 1) * 4 + 1; // Calculate start month based on season
		let endMonth = startMonth + 3; // End month is start month + 3

		if (season == 4) {
			startMonth = 1;
			endMonth = 12;
			axios
				.get("/api/v1/seasonal-leaderboard", {
					params: { year, startMonth, endMonth },
				})
				.then((response) => {
					const sortedData = sortData(response.data, sortKey);
					setLeaderboardData(sortedData);
				})
				.catch((error) => {
					console.error("Error fetching seasonal leaderboard:", error);
				});
		} else {
			axios
				.get("/api/v1/seasonal-leaderboard", {
					params: { year, startMonth, endMonth },
				})
				.then((response) => {
					const sortedData = sortData(response.data, sortKey);
					setLeaderboardData(sortedData);
				})
				.catch((error) => {
					console.error("Error fetching seasonal leaderboard:", error);
				});
		}
	};

	// Sort leaderboard data
	const sortData = (data, key) => {
		return [...data].sort((a, b) => b[key] - a[key]);
	};

	useEffect(() => {
		fetchSeasonalLeaderboard();
	}, [year, season, sortKey]);

	const handleSortChange = (e) => {
		const newSortKey = e.target.value;
		setSortKey(newSortKey);
		setLeaderboardData(sortData(leaderboardData, newSortKey));
	};

	return (
		<div className="page-content seasonal-leaderboard">
			<h1>Seasonal Leaderboard</h1>
			<div className="filters">
				<label>
					Year:
					<input
						type="number"
						value={year}
						onChange={(e) => setYear(e.target.value)}
					/>
				</label>
				<label>
					Season:
					<select value={season} onChange={(e) => setSeason(e.target.value)}>
						<option value={1}>Season 1 (Jan - Apr)</option>
						<option value={2}>Season 2 (May - Aug)</option>
						<option value={3}>Season 3 (Sep - Dec)</option>
						<option value={4}>Full year (Jan - Dec)</option>
					</select>
				</label>
				<label>
					Sort By:
					<select value={sortKey} onChange={handleSortChange}>
						<option value="total_goals">Goals</option>
						<option value="total_assists">Assists</option>
						<option value="total_defcons">Defcons</option>
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

export default SeasonalLeaderBoard;
