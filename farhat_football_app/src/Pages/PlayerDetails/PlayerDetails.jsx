import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./PlayerDetails.css";

function PlayerDetails() {
	const [player, setPlayer] = useState(null);
	const [stats, setStats] = useState([]);
	const { player_id } = useParams();

	useEffect(() => {
		// Fetch player details
		axios
			.get(`/api/v1/players/${player_id}`)
			.then((response) => {
				setPlayer(response.data[0]); // Assuming API returns an array
			})
			.catch((error) => {
				console.error("Error fetching player details:", error);
			});

		// Fetch player stats
		axios
			.get(`/api/v1/players/${player_id}/monthlystats`)
			.then((response) => {
				setStats(response.data);
			})
			.catch((error) => {
				console.error("Error fetching player stats:", error);
			});
	}, [player_id]);

	if (!player) {
		return <p>Loading player details...</p>;
	}

	return (
		<div className="page-content player-details">
			<h1>Profile of {player.preferred_name}</h1>
			{/* <div className="player-info">
				<p>
					<strong>Full Name:</strong> {player.first_name} {player.last_name}
				</p>
				<p>
					<strong>Year of Birth:</strong> {player.year_of_birth}
				</p>
			</div> */}

			<div className="player-stats">
				<h2>Performance Stats</h2>
				{stats.length > 0 ? (
					<table className="stats-table">
						<thead>
							<tr>
								<th>Month</th>
								<th>Year</th>
								<th>Goals</th>
								<th>Assists</th>
								<th>Defcons</th>
								<th>Chances Created</th>
								<th>Own Goals</th>
							</tr>
						</thead>
						<tbody>
							{stats.map((stat, index) => (
								<tr key={index}>
									<td>{stat.month}</td>
									<td>{stat.year}</td>
									<td>{stat.total_goals}</td>
									<td>{stat.total_assists}</td>
									<td>{stat.total_defcons}</td>
									<td>{stat.total_chancescreated}</td>
									<td>{stat.total_own_goals}</td>
								</tr>
							))}
						</tbody>
					</table>
				) : (
					<p>No performance stats available for this player.</p>
				)}
			</div>
		</div>
	);
}

export default PlayerDetails;
