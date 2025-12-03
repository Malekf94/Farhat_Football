import { useState, useEffect } from "react";
import axios from "axios";
import "./LeaderBoard.css";

function LeaderBoard() {
	const [year, setYear] = useState(new Date().getFullYear());
	const [month, setMonth] = useState(new Date().getMonth() + 1); // 1-based month
	const [leaderboardData, setLeaderboardData] = useState([]);
	const [sortKey, setSortKey] = useState("goals"); // Default sort by goals

	useEffect(() => {
		// Fetch leaderboard data whenever year, month, or sortKey changes
		axios
			.get("/api/v1/leaderboard", { params: { year, month } })
			.then((response) => {
				const sortedData = sortData(response.data, sortKey);
				setLeaderboardData(sortedData);
			})
			.catch((error) => {
				console.error("Error fetching leaderboard data:", error);
			});
	}, [year, month, sortKey]);

	// Function to sort data
	const sortData = (data, key) => {
		return [...data].sort((a, b) => b[key] - a[key]);
	};

	// Handle sorting
	const handleSortChange = (e) => {
		const newSortKey = e.target.value;
		setSortKey(newSortKey);
		setLeaderboardData(sortData(leaderboardData, newSortKey));
	};

	return (
		<div className="page-content leaderboard">
			<h1>Leaderboard</h1>
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
					Month:
					<select value={month} onChange={(e) => setMonth(e.target.value)}>
						{Array.from({ length: 12 }, (_, i) => (
							<option key={i + 1} value={i + 1}>
								{i + 1}
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
						<option value="total_chancescreated">Chances Created</option>
						<option value="man_of_the_match_count">Man of the Match</option>
						<option value="matches_played">Matches Played</option>
						<option value="wins">Wins</option>
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
						<th>Total Chances Created</th>
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

export default LeaderBoard;
