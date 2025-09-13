import { useState, useEffect } from "react";
import axios from "axios";
import "./StatLeaderBoard.css";

function StatLeaderBoard() {
	const [attributes, setAttributes] = useState([]);
	const [sortKey, setSortKey] = useState("finishing"); // default
	const [leaderboardData, setLeaderboardData] = useState([]);

	// Fetch list of attributes for dropdown
	useEffect(() => {
		axios
			.get("/api/v1/attributes")
			.then((res) => {
				setAttributes(res.data);
			})
			.catch((error) => {
				console.error("Error fetching attribute list:", error);
			});
	}, []);

	// Fetch leaderboard whenever sortKey changes
	useEffect(() => {
		axios
			.get(`/api/v1/attributes/leaderboard/${sortKey}`)
			.then((res) => {
				setLeaderboardData(res.data);
			})
			.catch((error) => {
				console.error("Error fetching leaderboard data:", error);
			});
	}, [sortKey]);

	return (
		<div className="page-content leaderboard">
			<h1>Leader board</h1>

			{/* Dropdown */}
			<div className="filters">
				<label htmlFor="attribute-select">Sort by: </label>
				<select
					id="attribute-select"
					value={sortKey}
					onChange={(e) => setSortKey(e.target.value)}
				>
					{attributes.map((attr, idx) => (
						<option key={idx} value={attr}>
							{attr.charAt(0).toUpperCase() + attr.slice(1)}
						</option>
					))}
				</select>
			</div>

			{/* Leaderboard table */}
			<table className="leaderboard-table">
				<thead>
					<tr>
						<th>Player</th>
						<th>{sortKey.charAt(0).toUpperCase() + sortKey.slice(1)}</th>
					</tr>
				</thead>
				<tbody>
					{leaderboardData.map((player) => (
						<tr key={player.player_id}>
							<td>{player.preferred_name}</td>
							<td>{player.stat}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export default StatLeaderBoard;
