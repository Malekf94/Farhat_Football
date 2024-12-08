import { useEffect, useState } from "react";
import "./IndividualMatch.css";
import axios from "axios";
import { useParams } from "react-router-dom";

function IndividualMatch() {
	const [match, setMatch] = useState(null);
	const [playersInMatch, setPlayersInMatch] = useState([]);
	const { match_id } = useParams();

	// Replace this with your actual logic for fetching the current user's ID
	const currentUserId = 12; // e.g., retrieved from context, JWT, or localStorage

	useEffect(() => {
		axios
			.get(`/api/v1/matches/${match_id}`)
			.then((response) => {
				setMatch(response.data[0]);
			})
			.catch((error) => {
				console.error("Error fetching match:", error);
			});
	}, [match_id]);

	const fetchPlayersInMatch = () => {
		axios
			.get(`/api/v1/matchPlayer/${match_id}`)
			.then((response) => {
				setPlayersInMatch(response.data);
			})
			.catch((error) => {
				console.error("Error fetching match players:", error);
			});
	};

	useEffect(() => {
		fetchPlayersInMatch();
	}, [match_id]);

	const handleJoinMatch = () => {
		axios
			.post("/api/v1/matchPlayer", {
				match_id: parseInt(match_id, 10),
				player_id: currentUserId,
			})
			.then(() => {
				// After successfully joining, refetch the players to update the list
				fetchPlayersInMatch();
			})
			.catch((error) => {
				console.error("Error joining match:", error);
				alert("Failed to join the game. Please try again.");
			});
	};

	if (!match) {
		return <p>Loading match details...</p>;
	}

	return (
		<div className="page-content">
			<h1>{match.match_name}</h1>

			{match.match_status === "pending" && (
				<button onClick={handleJoinMatch}>Join Game</button>
			)}

			<table className="playerTable">
				<thead>
					<tr>
						<th>Name</th>
						<th>Goals</th>
						<th>Assists</th>
						<th>Late</th>
					</tr>
				</thead>
				<tbody>
					{playersInMatch.map((player) => (
						<tr key={player.player_id}>
							<td>{player.preferred_name}</td>
							<td>{player.goals}</td>
							<td>{player.assists}</td>
							<td>{player.late ? "Yes" : "No"}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export default IndividualMatch;
