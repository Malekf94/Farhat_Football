import { useState, useEffect } from "react";
import { publicApi } from "../../api";
import "./StatLeaderBoard.css";

function StatLeaderBoard() {
	const [attributes, setAttributes] = useState([]);
	const [sortKey, setSortKey] = useState("finishing"); // default
	const [leaderboardData, setLeaderboardData] = useState([]);
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const limit = 10;

	// Fetch list of attributes for dropdown
	useEffect(() => {
		publicApi
			.get("/api/v1/attributes/")
			.then((res) => {
				setAttributes([...res.data, "total_stats"]); // add virtual option
			})
			.catch((error) => {
				console.error("Error fetching attribute list:", error);
			});
	}, []);

	// Fetch leaderboard whenever sortKey or page changes
	useEffect(() => {
		publicApi
			.get(`/api/v1/attributes/leaderboard/${sortKey}`, { params: { page } })
			.then((res) => {
				setLeaderboardData(res.data.data);
				setTotal(res.data.total);
			})
			.catch((error) => {
				console.error("Error fetching leaderboard data:", error);
			});
	}, [sortKey, page]);

	function formatLabel(attr) {
		if (attr === "total_stats") return "Total Stats";
		return attr
			.split("_")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	}

	return (
		<div className="page-content leaderboard">
			<h1>Attribute Leaderboard</h1>

			{/* Dropdown */}
			<div className="filters">
				<label htmlFor="attribute-select">Sort by: </label>
				<select
					id="attribute-select"
					value={sortKey}
					onChange={(e) => {
						setSortKey(e.target.value);
						setPage(1);
					}}
				>
					{attributes.map((attr, idx) => (
						<option key={idx} value={attr}>
							{formatLabel(attr)}
						</option>
					))}
				</select>
			</div>

		{/* Leaderboard table */}
			<table className="leaderboard-table">
				<thead>
					<tr>
						<th>#</th>
						<th>Player</th>
						<th>{formatLabel(sortKey)}</th>
					</tr>
				</thead>
				<tbody>
					{leaderboardData.map((player, idx) => (
						<tr key={player.player_id}>
							<td>{(page - 1) * limit + idx + 1}</td>
							<td>{player.preferred_name}</td>
							<td>{player.stat}</td>
						</tr>
					))}
				</tbody>
			</table>

			{/* Pagination */}
			<div className="pagination">
				<button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
					Previous
				</button>
				<span>
					Page {page} of {Math.max(1, Math.ceil(total / limit))}
				</span>
				<button
					disabled={page >= Math.ceil(total / limit)}
					onClick={() => setPage((p) => p + 1)}
				>
					Next
				</button>
			</div>
		</div>
	);
}

export default StatLeaderBoard;
