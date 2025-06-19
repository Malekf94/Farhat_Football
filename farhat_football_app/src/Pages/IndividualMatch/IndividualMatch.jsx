import { useEffect, useState, useCallback } from "react";
import PropTypes from "prop-types"; // Added prop-types
import "./IndividualMatch.css";
import axios from "axios";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate, useParams } from "react-router-dom";
import { parseISO, differenceInHours } from "date-fns";
// import { response } from "express";
import { randomiser } from "../../../../randomisermk2";

function IndividualMatch() {
	const { user, isAuthenticated } = useAuth0(); // Use Auth0 to get user info
	const [match, setMatch] = useState(null);
	const [pitch, setPitch] = useState(null);
	const [playersInMatch, setPlayersInMatch] = useState([]);
	const { match_id } = useParams();
	const [playerId, setPlayerId] = useState(null); // Store player_id dynamically
	const [isAdmin, setIsAdmin] = useState(false); // Track admin access
	const [team1Goals, setTeam1Goals] = useState(0);
	const [team2Goals, setTeam2Goals] = useState(0);
	const [manOfTheMatch, setManOfTheMatch] = useState(null);
	const [manOfTheMatchName, setManOfTheMatchName] = useState(null);
	const navigate = useNavigate();

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

	const team1 = playersInMatch.filter((player) => player.team_id === 1);
	const team2 = playersInMatch.filter((player) => player.team_id === 2);
	const reserves = playersInMatch.filter((player) => player.team_id === 0);

	// Fetch player_id from backend
	useEffect(() => {
		const fetchPlayerId = async () => {
			if (isAuthenticated && user) {
				try {
					const response = await axios.get(
						`/api/v1/players/check?email=${user.email}`
					);

					if (response.data.exists) {
						setPlayerId(response.data.player_id); // Set player_id
						setIsAdmin(response.data.is_admin); // Set player_id
					} else {
						console.error("Player not found in database");
					}
				} catch (error) {
					console.error("Error fetching player ID:", error);
				}
			}
		};

		fetchPlayerId();
	}, [isAuthenticated, user]);

	const fetchMatchDetails = useCallback(async () => {
		if (!playerId) return;
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
	}, [match_id, playerId]);

	useEffect(() => {
		// Fetch match details
		if (!playerId) return;
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
	}, [match_id, playerId]);

	const fetchPlayersInMatch = useCallback(() => {
		if (!playerId) return;
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
							own_goals: player.own_goals,
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
	}, [match_id, playerId]);

	useEffect(() => {
		if (!playerId) return;
		const fetchData = async () => {
			try {
				await fetchMatchDetails();
				await fetchPlayersInMatch();
			} catch (error) {
				console.error("Error fetching match and players data:", error);
			}
		};
		fetchData();
	}, [playerId]);

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

	const handleSavePlayerStats = async () => {
		const updatePromises = Object.entries(editedPlayerStats).map(
			([player_id, { goals, assists, own_goals, late, team_id }]) =>
				axios.put(`/api/v1/matchPlayer/${match_id}/${player_id}`, {
					goals: parseInt(goals, 10),
					assists: parseInt(assists, 10),
					own_goals: parseInt(own_goals, 10),
					late: late,
					team_id: team_id ? parseInt(team_id, 10) : null,
				})
		);

		try {
			await Promise.all(updatePromises);
			setIsEditingStats(false);
			fetchPlayersInMatch();
			alert("Player stats updated successfully.");
		} catch (error) {
			console.error("Error updating player stats:", error);
			alert("Failed to update player stats.");
		}
	};

	const userInMatch = playersInMatch.some(
		(player) => player.player_id === playerId
	);

	const handleJoinMatch = async () => {
		try {
			// Fetch player stats to get balance and match count
			const playerStatsResponse = await axios.get(
				`/api/v1/players/${playerId}/stats`
			);
			const { total_matches, account_balance } = playerStatsResponse.data;
			const playerYOBResponse = await axios.get(`/api/v1/players/${playerId}`);
			const { year_of_birth } = playerYOBResponse.data[0];

			// Check conditions
			if (
				year_of_birth > 2005 &&
				year_of_birth < 2009 &&
				account_balance < -5.5
			) {
				alert("You need money in your balance to join");
				return;
			} else if (
				year_of_birth < 2006 &&
				total_matches < 10 &&
				account_balance < match.price
			) {
				alert(
					`You need a balance of at least £${match.price} to join this match.`
				);
				return;
			} else if (total_matches >= 10 && account_balance < -12) {
				alert("You need money in your balance to join");
				return;
			}

			// Post join request with timestamp
			await axios.post("/api/v1/matchPlayer", {
				match_id: parseInt(match_id, 10),
				player_id: playerId,
				price: match.price,
				joined_at: new Date().toISOString(), // Add the current timestamp
			});

			// Refresh the players in the match
			fetchPlayersInMatch();
			alert("Successfully joined the match!");
		} catch (error) {
			console.error("Error joining match:", error);
			alert(
				"Failed to join the match. Please check your balance or try again."
			);
		}
	};

	const handleLeaveMatch = async () => {
		try {
			// Fetch match details to get match start time
			const matchResponse = await axios.get(`/api/v1/matches/${match_id}`);
			const matchData = matchResponse.data[0];
			const matchStartTime = parseISO(
				`${matchData.match_date.substring(0, 10)}T${matchData.match_time}`
			);
			const currentTime = new Date();

			// Calculate time difference in hours
			const timeDifference = differenceInHours(matchStartTime, currentTime);

			if (timeDifference < 5) {
				console.log("The match starts in less than 5 hours.");
			}

			if (timeDifference < 5) {
				// Notify the user and deduct the match price
				alert(
					`You are leaving less than 5 hours before the match starts. The match price of £${matchData.price} will be deducted from your balance.`
				);
				const confirmDelete = window.confirm(
					"Are you sure you want to leave this match?"
				);

				if (!confirmDelete) {
					return; // Exit if the user cancels
				}

				// Deduct the match price from the player's balance
				await axios.put(`/api/v1/players/balance/${playerId}`, {
					amount: -matchData.price,
					player_id: playerId,
				});
			}

			// Proceed with leaving the match
			await axios.delete("/api/v1/matchPlayer", {
				data: {
					match_id: parseInt(match_id, 10),
					player_id: playerId,
				},
			});

			fetchPlayersInMatch();
			alert("You have left the match!");
		} catch (error) {
			console.error("Error leaving match:", error);
			alert("Failed to leave the match. Please try again.");
		}
	};

	const calculateTeamScore = (team, opponentOwnGoals) =>
		team.reduce((sum, player) => sum + player.goals, 0) +
		opponentOwnGoals.reduce((sum, player) => sum + player.own_goals, 0);

	useEffect(() => {
		// Calculate Team Scores
		if (!team1 || !team2) return;
		setTeam1Goals(calculateTeamScore(team1, team2));
		setTeam2Goals(calculateTeamScore(team2, team1));

		// Fetch Man of the Match if already selected
		axios
			.get(`/api/v1/matches/${match_id}/manOfTheMatch`)
			.then((response) => {
				setManOfTheMatch(response.data.player_id || null);
				const matchPlayer = playersInMatch.find(
					(player) => player.player_id === response.data.player_id
				);
				setManOfTheMatchName(matchPlayer?.preferred_name || null);
			})
			.catch((error) =>
				console.error("Error fetching man of the match:", error)
			);
	}, [team1, team2, match_id, playersInMatch]);

	if (!match || !pitch || playerId === null) {
		return <p>Loading match details...</p>;
	}

	const handleManOfTheMatchChange = async (playerId) => {
		try {
			await axios.put(`/api/v1/matches/${match_id}/manOfTheMatch`, {
				player_id: playerId,
			});
			const matchPlayer = playersInMatch.find(
				(player) => player.player_id === playerId
			);
			setManOfTheMatch(playerId);
			setManOfTheMatchName(matchPlayer?.preferred_name || null);
			alert("Man of the match updated successfully!");
		} catch (error) {
			console.error("Error updating man of the match:", error);
			alert("Failed to update man of the match. Please try again.");
		}
	};

	const handleBalanceTeams = async () => {
		try {
			const response = await axios.get(
				`/api/v1/matchPlayer/attributes/${match_id}`
			);
			const playersAttributes = response.data;

			// 🔀 Run the randomiser function
			const { team1, team2 } = randomiser(playersAttributes);

			// Extract the player IDs from the two teams
			const team1Ids = team1.map((player) => player.player_id);
			const team2Ids = team2.map((player) => player.player_id);

			await axios.put(`/api/v1/matchPlayer/update-teams/${match_id}`, {
				team1: team1Ids,
				team2: team2Ids,
			});

			await fetchPlayersInMatch();
		} catch (error) {
			console.error("Error updating teams", error);
			alert("Failed to update teams. Please try again.");
		}
	};

	const handleDeleteMatch = async () => {
		const handleRemovePlayers = async () => {
			try {
				await Promise.all(
					playersInMatch.map((player) =>
						axios.delete("/api/v1/matchPlayer", {
							data: {
								match_id: parseInt(match_id, 10),
								player_id: player.player_id,
							},
						})
					)
				);
				alert("All players removed successfully.");
			} catch (error) {
				console.error("Error removing players:", error);
				alert("Unable to remove players.");
			}
		};
		if (isAdmin && playerId == 1) {
			const confirmDelete = window.confirm(
				"Are you sure you want to delete this match? This action cannot be undone."
			);

			if (!confirmDelete) {
				return; // Exit if the user cancels
			}
			try {
				// First, remove all players
				await handleRemovePlayers();

				// Then, delete the match
				await axios.delete(`/api/v1/matches/${match_id}`, {
					data: {
						player_id: playerId,
					},
				});
				alert("Match deleted successfully.");

				// Navigate to the home page
				navigate("/");
			} catch (error) {
				console.error("Error deleting match:", error);
				alert("Unable to delete match.");
			}
		}
	};
	return (
		<div className="page-content individual-match">
			<h1>{match.match_name}</h1>
			<div>
				{isAdmin && <button onClick={handleDeleteMatch}>Delete Match</button>}
			</div>
			<div>
				{isAdmin && <button onClick={handleBalanceTeams}>Balance Teams</button>}
			</div>
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
						isEditingMatch={isEditingMatch}
						setIsEditingMatch={setIsEditingMatch}
						editMatchFields={editMatchFields}
						setEditMatchFields={setEditMatchFields}
						handleSaveMatch={handleSaveMatch}
						userInMatch={userInMatch}
						handleJoinMatch={handleJoinMatch}
						handleLeaveMatch={handleLeaveMatch}
					/>
				)}
			</div>

			{/* Team Scores and Man of the Match */}
			<div className="team-scores">
				<h2>
					Team 1 ({team1Goals}) - ({team2Goals}) Team 2
				</h2>
			</div>
			<div className="man-of-the-match">
				<h3>Man of the Match</h3>
				{isAdmin ? (
					<select
						value={manOfTheMatch}
						onChange={(e) => handleManOfTheMatchChange(e.target.value)}
					>
						<option value="">Select Man of the Match</option>
						{playersInMatch.map((player) => (
							<option key={player.player_id} value={player.player_id}>
								{player.preferred_name}
							</option>
						))}
					</select>
				) : (
					<p>{manOfTheMatchName || "No man of the match selected yet."}</p>
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
			<p className="indiMatchesP">
				<strong>Date:</strong> {new Date(match.match_date).toLocaleDateString()}
			</p>
			<p className="indiMatchesP">
				<strong>Time:</strong> {match.match_time}
			</p>
			<p className="indiMatchesP">
				<strong>Price:</strong> £{match.price}
			</p>
			<p className="indiMatchesP">
				<strong>Pitch Name:</strong> {pitch.pitch_name}
			</p>
			<p className="indiMatchesP">
				<strong>Pitch Address:</strong> {pitch.address}
			</p>
			<p className="indiMatchesP">
				<strong>Pitch Postcode:</strong> {pitch.postcode}
			</p>
			<p className="indiMatchesP">
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
					step="0.10"
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
						<th>Own Goals</th>
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
											<input
												type="number"
												value={editData.own_goals}
												onChange={(e) =>
													setEditedPlayerStats((prev) => ({
														...prev,
														[player.player_id]: {
															...prev[player.player_id],
															own_goals: e.target.value,
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
												<option value="0">reserves</option>
												<option value="1">1</option>
												<option value="2">2</option>
											</select>
										</td>
									</>
								) : (
									<>
										<td>{player.goals}</td>
										<td>{player.assists}</td>
										<td>{player.own_goals}</td>
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
		postcode: PropTypes.string.isRequired,
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
	userInMatch: PropTypes.bool.isRequired,
	handleJoinMatch: PropTypes.func.isRequired,
	handleLeaveMatch: PropTypes.func.isRequired,
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
			own_goals: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
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
			own_goals: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
			late: PropTypes.bool,
			team_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		})
	),
	setEditedPlayerStats: PropTypes.func.isRequired,
	handleSavePlayerStats: PropTypes.func.isRequired,
};

export default IndividualMatch;
