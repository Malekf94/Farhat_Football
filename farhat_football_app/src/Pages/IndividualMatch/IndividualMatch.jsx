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

	const currentUserId = 12;

	// Editing match details
	const [isEditingMatch, setIsEditingMatch] = useState(false);
	const [editMatchFields, setEditMatchFields] = useState({
		match_status: "",
		match_time: "",
		number_of_players: "",
		price: "",
	});

	// One edit mode for all main players
	const [isEditingMainPlayers, setIsEditingMainPlayers] = useState(false);
	const [editedMainPlayers, setEditedMainPlayers] = useState({});

	useEffect(() => {
		axios
			.get(`/api/v1/matches/${match_id}`)
			.then((response) => {
				const matchData = response.data[0];
				setMatch(matchData);
				return axios.get(`/api/v1/pitches/${matchData.pitch_id}`);
			})
			.then((response) => {
				setPitch(response.data[0]);
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
			})
			.catch((error) => {
				console.error("Error fetching match players:", error);
			});
	};

	useEffect(() => {
		if (!match) return;
		fetchPlayersInMatch();
		formatDate();
	}, [match, match_id, formattedDate]);

	const handleJoinMatch = async () => {
		try {
			// Proceed with joining the match
			await axios.post("/api/v1/matchPlayer", {
				match_id: parseInt(match_id, 10),
				player_id: currentUserId,
				price: match.price,
			});

			fetchPlayersInMatch(); // Refresh player list
			alert("You have successfully joined the game.");
		} catch (error) {
			if (error.response && error.response.data && error.response.data.error) {
				// Show the specific backend error message
				alert(error.response.data.error);
			} else {
				// Fallback to a generic error message
				console.error("Error joining match:", error);
				alert("Failed to join the game. Please try again.");
			}
		}
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

	const userInMatch = playersInMatch.some((p) => p.player_id === currentUserId);

	if (!match || !pitch) {
		return <p>Loading match details...</p>;
	}

	// Split players into main and reserves
	const mainPlayers = playersInMatch.slice(0, match.number_of_players);
	const reserves = playersInMatch.slice(match.number_of_players);

	// Edit Match Handlers
	const handleEditMatchClick = () => {
		setIsEditingMatch(true);
		setEditMatchFields({
			match_status: match.match_status,
			match_time: match.match_time,
			number_of_players: match.number_of_players,
			price: match.price,
		});
	};

	const handleSaveMatch = async () => {
		const { match_status, match_time, number_of_players, price } =
			editMatchFields;

		const isStatusChanging =
			match.match_status === "pending" &&
			["in_progress"].includes(match_status);
		// console.log(isStatusChanging);
		try {
			// Update match details

			const response = await axios.put(`/api/v1/matches/${match_id}`, {
				match_status,
				match_time,
				number_of_players: parseInt(number_of_players, 10) || null,
				price: parseFloat(price) || null,
			});

			setMatch(response.data[0]); // Update the match state to trigger re-render
			setIsEditingMatch(false);

			// Force page to re-fetch match data to ensure it's up-to-date
			fetchPlayersInMatch();

			// Charge players if status changes to in progress
			if (isStatusChanging) {
				const chargePromises = mainPlayers.map(async (player) => {
					let totalAmount = -price;
					if (player.late) {
						totalAmount--;
					}
					console.log(totalAmount);
					try {
						const result = await axios.put(
							`/api/v1/players/balance/${player.player_id}`,
							{ amount: parseFloat(totalAmount), player_id: player.player_id }
						);
						console.log(
							`Player ${player.player_id} charged successfully:`,
							result.data
						);
					} catch (error) {
						console.error(`Error charging player ${player.player_id}:`, error);
					}
				});

				await Promise.all(chargePromises);
				alert("Players have been charged successfully.");
				fetchPlayersInMatch(); // Ensure the players' balances are reflected in the UI
			}
		} catch (error) {
			console.error("Error updating match or charging players:", error);
			alert("Failed to update match or charge players.");
		}
	};

	const handleMatchFieldChange = (e) => {
		const { name, value } = e.target;
		setEditMatchFields((prev) => ({ ...prev, [name]: value }));
	};

	// Editing all main players
	const handleEditMainPlayersClick = () => {
		setIsEditingMainPlayers(true);
		const initialEdits = {};
		mainPlayers.forEach((player) => {
			initialEdits[player.player_id] = {
				goals: player.goals,
				assists: player.assists,
				late: player.late,
			};
		});
		setEditedMainPlayers(initialEdits);
	};

	const handleMainPlayerFieldChange = (player_id, field, value) => {
		setEditedMainPlayers((prev) => ({
			...prev,
			[player_id]: {
				...prev[player_id],
				[field]: field === "late" ? value === "true" : value,
			},
		}));
	};

	const handleSaveMainPlayers = () => {
		const updatePromises = Object.entries(editedMainPlayers).map(
			([player_id, { goals, assists, late }]) =>
				axios.put(`/api/v1/matchPlayer/${match_id}/${player_id}`, {
					goals: parseInt(goals, 10),
					assists: parseInt(assists, 10),
					late: late,
				})
		);

		Promise.all(updatePromises)
			.then(() => {
				setIsEditingMainPlayers(false);
				fetchPlayersInMatch();
			})
			.catch((error) => {
				console.error("Error updating main players:", error);
				alert("Failed to update players. Please try again.");
			});
	};

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
				<p>
					<strong>Match Status:</strong> {match.match_status}
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

			{/* Edit Match Form */}
			<div className="admin-actions">
				{!isEditingMatch ? (
					<button onClick={handleEditMatchClick}>Edit Match</button>
				) : (
					<div className="edit-form">
						<label>
							Status:
							<select
								name="match_status"
								value={editMatchFields.match_status}
								onChange={handleMatchFieldChange}
							>
								<option value="pending">Pending</option>
								<option value="in_progress">In Progress</option>
								<option value="friendly">Friendly</option>
								<option value="completed">Completed</option>
								<option value="cancelled">Cancelled</option>
							</select>
						</label>

						<label>
							Time:
							<input
								type="time"
								name="match_time"
								value={editMatchFields.match_time}
								onChange={handleMatchFieldChange}
							/>
						</label>

						<label>
							Number of Players:
							<input
								type="number"
								name="number_of_players"
								value={editMatchFields.number_of_players}
								onChange={handleMatchFieldChange}
							/>
						</label>

						<label>
							Price:
							<input
								type="number"
								step="0.05"
								name="price"
								value={editMatchFields.price}
								onChange={handleMatchFieldChange}
							/>
						</label>

						<button onClick={handleSaveMatch}>Save</button>
					</div>
				)}
			</div>

			<h2>Players</h2>
			{!isEditingMainPlayers ? (
				<button onClick={handleEditMainPlayersClick}>Edit Main Players</button>
			) : (
				<button onClick={handleSaveMainPlayers}>Save Main Players</button>
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
					{mainPlayers.map((player) => {
						const editData = editedMainPlayers[player.player_id] || {};
						const isEditing = isEditingMainPlayers && editData;

						return (
							<tr key={player.player_id}>
								<td>{player.preferred_name}</td>
								{isEditing ? (
									<>
										<td>
											<input
												type="number"
												value={editData.goals}
												onChange={(e) =>
													handleMainPlayerFieldChange(
														player.player_id,
														"goals",
														e.target.value
													)
												}
											/>
										</td>
										<td>
											<input
												type="number"
												value={editData.assists}
												onChange={(e) =>
													handleMainPlayerFieldChange(
														player.player_id,
														"assists",
														e.target.value
													)
												}
											/>
										</td>
										<td>
											<select
												value={editData.late}
												onChange={(e) =>
													handleMainPlayerFieldChange(
														player.player_id,
														"late",
														e.target.value
													)
												}
											>
												<option value="false">No</option>
												<option value="true">Yes</option>
											</select>
										</td>
									</>
								) : (
									<>
										<td>{player.goals}</td>
										<td>{player.assists}</td>
										<td>{player.late ? "Yes" : "No"}</td>
									</>
								)}
							</tr>
						);
					})}
				</tbody>
			</table>

			{reserves.length > 0 && (
				<>
					<h2>Reserves</h2>
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
							{reserves.map((player) => (
								<tr key={player.player_id}>
									<td>{player.preferred_name}</td>
									<td>{player.goals}</td>
									<td>{player.assists}</td>
									<td>{player.late ? "Yes" : "No"}</td>
								</tr>
							))}
						</tbody>
					</table>
				</>
			)}
		</div>
	);
}

export default IndividualMatch;
