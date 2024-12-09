import { useEffect, useState } from "react";
import "./IndividualMatch.css";
import axios from "axios";
import { useParams } from "react-router-dom";

function IndividualMatch() {
	const [match, setMatch] = useState(null);
	const [pitch, setPitch] = useState(null);
	const [playersInMatch, setPlayersInMatch] = useState([]);
	const { match_id } = useParams();
	const [formattedDate, setFormattedDate] = useState(null);

	// Replace this with actual logic to get the current logged-in user's ID
	const currentUserId = 33;

	useEffect(() => {
		// Fetch match details
		axios
			.get(`/api/v1/matches/${match_id}`)
			.then((response) => {
				const matchData = response.data[0];
				setMatch(matchData);

				// Once match is fetched, get pitch details
				return axios.get(`/api/v1/pitches/${matchData.pitch_id}`);
			})
			.then((response) => {
				setPitch(response.data[0]); // Assuming the pitch endpoint returns an array
			})
			.catch((error) => {
				console.error("Error fetching match or pitch:", error);
			});
	}, [match_id]);

	const formatDate = () => {
		const dateObj = new Date(match.match_date);
		const day = String(dateObj.getDate()).padStart(2, "0");
		const month = String(dateObj.getMonth() + 1).padStart(2, "0");
		const year = dateObj.getFullYear();
		const formattedDatea = `${day}/${month}/${year}`;
		setFormattedDate(formattedDatea);
	};

	const fetchPlayersInMatch = () => {
		axios
			.get(`/api/v1/matchPlayer/${match_id}`)
			.then((response) => {
				setPlayersInMatch(response.data);
				console.log(response.data);
			})
			.catch((error) => {
				console.error("Error fetching match players:", error);
			});
	};

	useEffect(() => {
		if (!match) return; // Wait until match is not null before proceeding

		fetchPlayersInMatch();
		formatDate();
	}, [match, match_id, formattedDate]);

	const handleJoinMatch = () => {
		axios
			.post("/api/v1/matchPlayer", {
				match_id: parseInt(match_id, 10),
				player_id: currentUserId,
				price: match.price,
				// If needed, also pass 'price' if required by your add player endpoint
			})
			.then(() => {
				fetchPlayersInMatch();
			})
			.catch((error) => {
				console.error("Error joining match:", error);
				alert("Failed to join the game. Please try again.");
			});
	};

	const handleLeaveMatch = () => {
		axios
			.delete("/api/v1/matchPlayer", {
				data: {
					match_id: parseInt(match_id, 10),
					player_id: currentUserId,
				},
			})
			.then(() => {
				fetchPlayersInMatch();
			})
			.catch((error) => {
				console.error("Error leaving match:", error);
				alert("Failed to leave the game. Please try again.");
			});
	};

	if (!match || !pitch) {
		return <p>Loading match details...</p>;
	}

	const userInMatch = playersInMatch.some((p) => p.player_id === currentUserId);

	return (
		<div className="page-content individual-match">
			<h1>{match.match_name}</h1>
			<div className="match-details">
				<p>
					<strong>Date:</strong> {formattedDate}
				</p>
				<p>
					<strong>Time:</strong> {match.match_time}
				</p>
				<p>
					<strong>Price (per person):</strong> £{match.price}
				</p>
				<p>
					<strong>Number of players:</strong> {match.number_of_players}
				</p>
				<p>
					<strong>Pitch Name:</strong> {pitch.pitch_name}
				</p>
				<p>
					<strong>Pitch Address:</strong> {pitch.address}
				</p>
			</div>

			{match.match_status === "pending" && (
				<div className="match-actions">
					{!userInMatch ? (
						<button onClick={handleJoinMatch}>Join Game</button>
					) : (
						<button onClick={handleLeaveMatch}>Out</button>
					)}
				</div>
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
