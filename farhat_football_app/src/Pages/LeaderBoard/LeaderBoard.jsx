import { useState, useEffect } from "react";
import { publicApi } from "../../api";
import { useHost } from "../../context/HostContext";
import "./LeaderBoard.css";

function LeaderBoard() {
	const { hostId } = useHost();
	const [year, setYear] = useState(new Date().getFullYear());
	const [month, setMonth] = useState(new Date().getMonth() + 1); // 1-based month
	const [leaderboardData, setLeaderboardData] = useState([]);
	const [sortKey, setSortKey] = useState("goals"); // Default sort by goals

	useEffect(() => {
		if (!hostId) return;
		// Fetch leaderboard data whenever year, month, or sortKey changes
		publicApi
			.get("/api/v1/leaderboard", { params: { year, month, host_id: hostId } })
			.then((response) => {
				const sortedData = sortData(response.data, sortKey);
				setLeaderboardData(sortedData);
			})
			.catch((error) => {
				console.error("Error fetching leaderboard data:", error);
			});
	}, [year, month, sortKey, hostId]);

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
			<div className="lb-filters">
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
						<option value="total_chancescreated">Key Passes</option>
						<option value="man_of_the_match_count">Man of the Match</option>
						<option value="matches_played">Matches Played</option>
						<option value="wins">Wins</option>
						<option value="avg_rating">Avg Rating</option>
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
						<th>Avg Rating</th>
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
							<td>
								{player.avg_rating != null
									? Number(player.avg_rating).toFixed(2)
									: "—"}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export default LeaderBoard;
