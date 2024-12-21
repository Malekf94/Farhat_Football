import { useState, useEffect } from "react";
import axios from "axios";
import "./Lates.css";

function Lates() {
	const [lates, setLates] = useState([]);
	const [negativeBalances, setNegativeBalances] = useState([]);

	useEffect(() => {
		// Fetch late players
		axios
			.get("/api/v1/matchPlayer/lates")
			.then((response) => {
				setLates(response.data);
			})
			.catch((error) => {
				console.error("Error fetching lates:", error);
			});

		// Fetch players with negative balances
		axios
			.get("/api/v1/players/negativeBalances")
			.then((response) => {
				setNegativeBalances(response.data);
			})
			.catch((error) => {
				console.error("Error fetching negative balances:", error);
			});
	}, []);

	return (
		<div className="page-content">
			<h1>Late Players</h1>
			<table className="latesTable">
				<thead>
					<tr>
						<th>Date</th>
						<th>Player Name</th>
					</tr>
				</thead>
				<tbody>
					{lates.length > 0 ? (
						lates.map((late, index) => (
							<tr key={index}>
								<td>{new Date(late.match_date).toLocaleDateString()}</td>
								<td>{late.full_name}</td>
							</tr>
						))
					) : (
						<tr>
							<td colSpan="2">No late players found</td>
						</tr>
					)}
				</tbody>
			</table>

			<h2>Players with Negative Balances</h2>
			<table className="negativeBalanceTable">
				<thead>
					<tr>
						<th>Player Name</th>
						<th>Balance</th>
					</tr>
				</thead>
				<tbody>
					{negativeBalances.length > 0 ? (
						negativeBalances.map((player, index) => (
							<tr key={index}>
								<td>{player.full_name}</td>
								<td>£{player.account_balance}</td>
							</tr>
						))
					) : (
						<tr>
							<td colSpan="2">No players with negative balances</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
}

export default Lates;
