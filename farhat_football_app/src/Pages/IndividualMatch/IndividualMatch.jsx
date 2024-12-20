import { useEffect, useState, useCallback } from "react";
import PropTypes from "prop-types"; // Added prop-types
import "./IndividualMatch.css";
import axios from "axios";
import { useParams } from "react-router-dom";

function IndividualMatch() {
	const [match, setMatch] = useState(null);
	const [pitch, setPitch] = useState(null);
	const [playersInMatch, setPlayersInMatch] = useState([]);
	const { match_id } = useParams();

	const currentUserId = 12; // Replace with logged-in user ID
	const [isAdmin, setIsAdmin] = useState(false); // Track admin access

	// Toggle edit modes
	const [isEditingMatch, setIsEditingMatch] = useState(false);
	const [isEditingStats, setIsEditingStats] = useState(false);

	// Edited data states
	const [editMatchFields, setEditMatchFields] = useState({
		match_status: "",
		match_time: "",
		number_of_players: "",
		price: "",
		youtube_links: "",
	});
	const [editedPlayerStats, setEditedPlayerStats] = useState({});

	const fetchMatchDetails = useCallback(async () => {
		try {
			const matchResponse = await axios.get(`/api/v1/matches/${match_id}`);
			const matchData = matchResponse.data[0];
			setMatch(matchData);

			const pitchResponse = await axios.get(
				`/api/v1/pitches/${matchData.pitch_id}`
			);
			setPitch(pitchResponse.data[0]);

			setEditMatchFields({
				match_status: matchData.match_status,
				match_time: matchData.match_time,
				number_of_players: matchData.number_of_players,
				price: matchData.price,
				youtube_links: matchData.youtube_links || "",
			});
		} catch (error) {
			console.error("Error fetching match or pitch details:", error);
		}
	}, [match_id]);

	useEffect(() => {
		// Fetch match details
		axios
			.get(`/api/v1/matches/${match_id}`)
			.then((response) => {
				const matchData = response.data[0];
				setMatch(matchData);
				setEditMatchFields({
					match_status: matchData.match_status,
					match_time: matchData.match_time,
					number_of_players: matchData.number_of_players,
					price: matchData.price,
					youtube_links: matchData.youtube_links || "",
				});
				return axios.get(`/api/v1/pitches/${matchData.pitch_id}`);
			})
			.then((response) => {
				setPitch(response.data[0]);
			})
			.catch((error) => {
				console.error("Error fetching match or pitch:", error);
			});

		// Check admin access for the current player
		axios
			.get(`/api/v1/players/${currentUserId}`)
			.then((response) => {
				setIsAdmin(response.data[0]?.is_admin || false);
			})
			.catch((error) => {
				console.error("Error fetching user details:", error);
			});
	}, [match_id, currentUserId]);

	const fetchPlayersInMatch = useCallback(() => {
		axios
			.get(`/api/v1/matchPlayer/${match_id}`)
			.then((response) => {
				const sortedPlayers = response.data.sort(
					(a, b) => new Date(a.joined_at) - new Date(b.joined_at)
				);
				setPlayersInMatch(sortedPlayers);
				setEditedPlayerStats(
					sortedPlayers.reduce((acc, player) => {
						acc[player.player_id] = {
							goals: player.goals,
							assists: player.assists,
							late: player.late,
							team_id: player.team_id,
						};
						return acc;
					}, {})
				);
			})
			.catch((error) => {
				console.error("Error fetching match players:", error);
			});
	}, [match_id]);

	useEffect(() => {
		fetchMatchDetails();
	}, [fetchMatchDetails]);

	useEffect(() => {
		if (!match) return;
		fetchPlayersInMatch();
	}, [match, fetchPlayersInMatch]);

	const handleSaveMatch = async () => {
		const {
			match_status,
			match_time,
			number_of_players,
			price,
			youtube_links,
		} = editMatchFields;

		try {
			// Update match details

			const response = await axios.put(`/api/v1/matches/${match_id}`, {
				match_status,
				match_time,
				number_of_players: parseInt(number_of_players, 10) || null,
				price: parseFloat(price) || null,
				youtube_links: youtube_links || null,
			});

			// Update match state from the response
			setMatch(response.data[0]);

			// Refetch match and pitch details
			await fetchMatchDetails();

			setIsEditingMatch(false);
			alert("Match details updated successfully.");
		} catch (error) {
			console.error("Error updating match details:", error);
			alert("Failed to update match details. Please try again.");
		}
	};

	const handleSavePlayerStats = () => {
		const updatePromises = Object.entries(editedPlayerStats).map(
			([player_id, { goals, assists, late, team_id }]) =>
				axios.put(`/api/v1/matchPlayer/${match_id}/${player_id}`, {
					goals: parseInt(goals, 10),
					assists: parseInt(assists, 10),
					late: late,
					team_id: parseInt(team_id, 10) || null,
				})
		);

		Promise.all(updatePromises)
			.then(() => {
				setIsEditingStats(false);
				fetchPlayersInMatch();
				alert("Player stats updated successfully.");
			})
			.catch((error) => {
				console.error("Error fetching user details:", error);
				alert("Failed to update player stats.");
			});
	};

	const userInMatch = playersInMatch.some(
		(player) => player.player_id === currentUserId
	);

	const handleJoinMatch = async () => {
		try {
			await axios.post("/api/v1/matchPlayer", {
				match_id: parseInt(match_id, 10),
				player_id: currentUserId,
				price: match.price,
			});
			fetchPlayersInMatch();
			alert("Successfully joined the match!");
		} catch (error) {
			console.error("Error joining match:", error);
			alert("Failed to join the match.");
		}
	};

	const handleLeaveMatch = async () => {
		try {
			await axios.delete("/api/v1/matchPlayer", {
				data: {
					match_id: parseInt(match_id, 10),
					player_id: currentUserId,
				},
			});
			fetchPlayersInMatch();
			alert("You have left the match!");
		} catch (error) {
			console.error("Error leaving match:", error);
			alert("Failed to leave the match.");
		}
	};

	if (!match || !pitch) {
		return <p>Loading match details...</p>;
	}

	const team1 = playersInMatch.filter((player) => player.team_id === 1);
	const team2 = playersInMatch.filter((player) => player.team_id === 2);
	const reserves = playersInMatch.filter((player) => !player.team_id);

	return (
		<div className="page-content individual-match">
			<h1>{match.match_name}</h1>
			<div className="match-details">
				{isAdmin && isEditingMatch ? (
					<EditMatchForm
						editMatchFields={editMatchFields}
						setEditMatchFields={setEditMatchFields}
						handleSaveMatch={handleSaveMatch}
					/>
				) : (
					<MatchDetails
						match={match}
						pitch={pitch}
						isAdmin={isAdmin}
						isEditingMatch={isEditingMatch} // Pass this prop
						setIsEditingMatch={setIsEditingMatch} // Pass this prop
						editMatchFields={editMatchFields} // Pass this prop
						setEditMatchFields={setEditMatchFields} // Pass this prop
						handleSaveMatch={handleSaveMatch} // Pass this prop
						userInMatch={userInMatch}
						handleJoinMatch={handleJoinMatch}
						handleLeaveMatch={handleLeaveMatch}
					/>
				)}
			</div>

			<h2>Team 1</h2>
			<PlayerTable
				players={team1}
				isAdmin={isAdmin}
				isEditingStats={isEditingStats}
				setIsEditingStats={setIsEditingStats}
				editedPlayerStats={editedPlayerStats}
				setEditedPlayerStats={setEditedPlayerStats}
				handleSavePlayerStats={handleSavePlayerStats}
			/>

			<h2>Team 2</h2>
			<PlayerTable
				players={team2}
				isAdmin={isAdmin}
				isEditingStats={isEditingStats}
				setIsEditingStats={setIsEditingStats}
				editedPlayerStats={editedPlayerStats}
				setEditedPlayerStats={setEditedPlayerStats}
				handleSavePlayerStats={handleSavePlayerStats}
			/>

			<h2>Reserves</h2>
			<PlayerTable
				players={reserves}
				isAdmin={isAdmin}
				isEditingStats={isEditingStats}
				setIsEditingStats={setIsEditingStats}
				editedPlayerStats={editedPlayerStats}
				setEditedPlayerStats={setEditedPlayerStats}
				handleSavePlayerStats={handleSavePlayerStats}
			/>
		</div>
	);
}

function MatchDetails({
	match,
	pitch,
	isAdmin,
	setIsEditingMatch,
	userInMatch,
	handleJoinMatch,
	handleLeaveMatch,
}) {
	return (
		<>
			<p>
				<strong>Date:</strong> {new Date(match.match_date).toLocaleDateString()}
			</p>
			<p>
				<strong>Time:</strong> {match.match_time}
			</p>
			<p>
				<strong>Price:</strong> £{match.price}
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
			{match.youtube_links && (
				<div className="youtube-links">
					<h2>YouTube Link</h2>
					<a
						href={match.youtube_links}
						target="_blank"
						rel="noopener noreferrer"
					>
						{match.youtube_links}
					</a>
				</div>
			)}

			{match.match_status === "pending" && (
				<div className="match-actions">
					{!userInMatch ? (
						<button onClick={handleJoinMatch}>Join Match</button>
					) : (
						<button onClick={handleLeaveMatch}>Leave Match</button>
					)}
				</div>
			)}

			{isAdmin && (
				<button onClick={() => setIsEditingMatch(true)}>Edit Match</button>
			)}
		</>
	);
}

function EditMatchForm({
	editMatchFields,
	setEditMatchFields,
	handleSaveMatch,
}) {
	return (
		<>
			<label>
				Status:
				<select
					name="match_status"
					value={editMatchFields.match_status}
					onChange={(e) =>
						setEditMatchFields({
							...editMatchFields,
							match_status: e.target.value,
						})
					}
				>
					<option value="pending">Pending</option>
					<option value="in_progress">In Progress</option>
					<option value="friendly">Friendly</option>
					<option value="completed">Completed</option>
				</select>
			</label>
			<label>
				Time:
				<input
					type="time"
					name="match_time"
					value={editMatchFields.match_time}
					onChange={(e) =>
						setEditMatchFields({
							...editMatchFields,
							match_time: e.target.value,
						})
					}
				/>
			</label>
			<label>
				Number of Players:
				<input
					type="number"
					name="number_of_players"
					value={editMatchFields.number_of_players}
					onChange={(e) =>
						setEditMatchFields({
							...editMatchFields,
							number_of_players: e.target.value,
						})
					}
				/>
			</label>
			<label>
				Price:
				<input
					type="number"
					step="0.01"
					name="price"
					value={editMatchFields.price}
					onChange={(e) =>
						setEditMatchFields({
							...editMatchFields,
							price: e.target.value,
						})
					}
				/>
			</label>
			<label>
				YouTube Link:
				<input
					type="url"
					name="youtube_link"
					value={editMatchFields.youtube_links}
					onChange={(e) =>
						setEditMatchFields({
							...editMatchFields,
							youtube_links: e.target.value,
						})
					}
				/>
			</label>
			<button onClick={handleSaveMatch}>Save</button>
		</>
	);
}

function PlayerTable({
	players,
	isAdmin,
	isEditingStats,
	setIsEditingStats,
	editedPlayerStats,
	setEditedPlayerStats,
	handleSavePlayerStats,
}) {
	return (
		<div>
			{isAdmin && !isEditingStats && (
				<button onClick={() => setIsEditingStats(true)}>Edit Stats</button>
			)}
			{isAdmin && isEditingStats && (
				<button onClick={handleSavePlayerStats}>Save Stats</button>
			)}

			<table className="playerTable">
				<thead>
					<tr>
						<th>Name</th>
						<th>Goals</th>
						<th>Assists</th>
						<th>Late</th>
						{isEditingStats && <th>Team</th>}
					</tr>
				</thead>
				<tbody>
					{players.map((player) => {
						const editData = editedPlayerStats[player.player_id] || {};
						const isEditing = isEditingStats && isAdmin;

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
													setEditedPlayerStats((prev) => ({
														...prev,
														[player.player_id]: {
															...prev[player.player_id],
															goals: e.target.value,
														},
													}))
												}
											/>
										</td>
										<td>
											<input
												type="number"
												value={editData.assists}
												onChange={(e) =>
													setEditedPlayerStats((prev) => ({
														...prev,
														[player.player_id]: {
															...prev[player.player_id],
															assists: e.target.value,
														},
													}))
												}
											/>
										</td>
										<td>
											<select
												value={editData.late}
												onChange={(e) =>
													setEditedPlayerStats((prev) => ({
														...prev,
														[player.player_id]: {
															...prev[player.player_id],
															late: e.target.value === "true",
														},
													}))
												}
											>
												<option value="false">No</option>
												<option value="true">Yes</option>
											</select>
										</td>
										<td>
											<select
												value={editData.team_id || ""}
												onChange={(e) =>
													setEditedPlayerStats((prev) => ({
														...prev,
														[player.player_id]: {
															...prev[player.player_id],
															team_id: e.target.value || null,
														},
													}))
												}
											>
												<option value="">Reserves</option>
												<option value="1">Team 1</option>
												<option value="2">Team 2</option>
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
		</div>
	);
}

MatchDetails.propTypes = {
	match: PropTypes.shape({
		match_name: PropTypes.string.isRequired,
		match_date: PropTypes.string.isRequired,
		match_time: PropTypes.string.isRequired,
		price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
		match_status: PropTypes.string.isRequired,
		youtube_links: PropTypes.string, // Expect an array of strings
	}).isRequired,
	pitch: PropTypes.shape({
		pitch_name: PropTypes.string.isRequired,
		address: PropTypes.string.isRequired,
	}).isRequired,
	isAdmin: PropTypes.bool.isRequired,
	isEditingMatch: PropTypes.bool.isRequired,
	editMatchFields: PropTypes.shape({
		match_status: PropTypes.string.isRequired,
		match_time: PropTypes.string.isRequired,
		number_of_players: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
			.isRequired,
		price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
		youtube_links: PropTypes.string, // In edit mode, this is expected as a string
	}).isRequired,
	setEditMatchFields: PropTypes.func.isRequired,
	handleSaveMatch: PropTypes.func.isRequired,
	setIsEditingMatch: PropTypes.func.isRequired,
};

EditMatchForm.propTypes = {
	editMatchFields: PropTypes.shape({
		match_status: PropTypes.string,
		match_time: PropTypes.string,
		number_of_players: PropTypes.oneOfType([
			PropTypes.string,
			PropTypes.number,
		]),
		price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		youtube_links: PropTypes.string,
	}),
	setEditMatchFields: PropTypes.func.isRequired,
	handleSaveMatch: PropTypes.func.isRequired,
};

PlayerTable.propTypes = {
	players: PropTypes.arrayOf(
		PropTypes.shape({
			player_id: PropTypes.number,
			preferred_name: PropTypes.string,
			goals: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
			assists: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
			late: PropTypes.bool,
			team_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		})
	),
	isAdmin: PropTypes.bool,
	isEditingStats: PropTypes.bool,
	setIsEditingStats: PropTypes.func.isRequired,
	editedPlayerStats: PropTypes.objectOf(
		PropTypes.shape({
			goals: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
			assists: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
			late: PropTypes.bool,
			team_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		})
	),
	setEditedPlayerStats: PropTypes.func.isRequired,
	handleSavePlayerStats: PropTypes.func.isRequired,
};

export default IndividualMatch;
