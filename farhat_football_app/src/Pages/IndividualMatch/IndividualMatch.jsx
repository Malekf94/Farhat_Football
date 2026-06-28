import { useEffect, useState, useCallback } from "react";
import PropTypes from "prop-types";
import "./IndividualMatch.css";
import { useNavigate, useParams } from "react-router-dom";
import { parseISO, differenceInHours } from "date-fns";
import { randomiserMk3 } from "../../../../randomisermk3";
import { privateApi } from "../../api";
import { useCurrentPlayer } from "../../hooks/useCurrentPlayer";
import ConfirmModal from "../../components/ConfirmModal";

function IndividualMatch() {
	const { playerId, isAdmin } = useCurrentPlayer();
	const [match, setMatch] = useState(null);
	const [pitch, setPitch] = useState(null);
	const [playersInMatch, setPlayersInMatch] = useState([]);
	const { match_id } = useParams();
	const [team1Goals, setTeam1Goals] = useState(0);
	const [team2Goals, setTeam2Goals] = useState(0);
	const [manOfTheMatch, setManOfTheMatch] = useState(null);
	const [modal, setModal] = useState(null);
	const [toast, setToast] = useState(null);
	const [emailModal, setEmailModal] = useState(false);
	const navigate = useNavigate();

	const [isEditingMatch, setIsEditingMatch] = useState(false);
	const [isEditingStats, setIsEditingStats] = useState(false);

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

	const showToast = (message, type = "success") => {
		setToast({ message, type });
		setTimeout(() => setToast(null), 3000);
	};

	const motmPlayer = playersInMatch.find((p) => p.player_id === manOfTheMatch);

	const fetchMatchDetails = useCallback(async () => {
		if (!playerId) return;
		try {
			const matchResponse = await privateApi.get(`/api/v1/matches/${match_id}`);
			const matchData = matchResponse.data[0];
			setMatch(matchData);
			setManOfTheMatch(matchData.man_of_the_match || null);

			const pitchResponse = await privateApi.get(
				`/api/v1/pitches/${matchData.pitch_id}`,
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

	const fetchPlayersInMatch = useCallback(() => {
		if (!playerId) return;
		privateApi
			.get(`/api/v1/matchPlayer/${match_id}`)
			.then((response) => {
				const sortedPlayers = response.data.sort(
					(a, b) => new Date(a.joined_at) - new Date(b.joined_at),
				);
				setPlayersInMatch(sortedPlayers);
				setEditedPlayerStats(
					sortedPlayers.reduce((acc, player) => {
						acc[player.player_id] = {
							goals: player.goals,
							assists: player.assists,
							defcons: player.defcons,
							chancescreated: player.chancescreated,
							own_goals: player.own_goals,
							late: player.late,
							team_id: player.team_id,
						};
						return acc;
					}, {}),
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
		const { match_status, match_time, number_of_players, price, youtube_links } =
			editMatchFields;

		try {
			let winningTeam = null;
			if (team1Goals > team2Goals) winningTeam = 1;
			else if (team2Goals > team1Goals) winningTeam = 2;

			const response = await privateApi.put(`/api/v1/matches/${match_id}`, {
				match_status,
				match_time,
				number_of_players: parseInt(number_of_players, 10) || null,
				price: parseFloat(price) || null,
				youtube_links: youtube_links || null,
				winning_team: winningTeam,
			});

			setMatch(response.data[0]);
			await fetchMatchDetails();
			setIsEditingMatch(false);
			showToast("Match details updated.");
		} catch (error) {
			console.error("Error updating match details:", error);
			showToast("Failed to update match details.", "error");
		}
	};

	const handleSavePlayerStats = async () => {
		const players = Object.entries(editedPlayerStats).map(
			([player_id, stats]) => ({
				player_id: parseInt(player_id, 10),
				goals: parseInt(stats.goals, 10),
				assists: parseInt(stats.assists, 10),
				defcons: parseInt(stats.defcons, 10),
				chancescreated: parseInt(stats.chancescreated, 10),
				own_goals: parseInt(stats.own_goals, 10),
				late: stats.late,
				team_id: stats.team_id ? parseInt(stats.team_id, 10) : null,
			}),
		);

		try {
			await privateApi.put(`/api/v1/matchPlayer/batch-stats/${match_id}`, {
				players,
			});
			setIsEditingStats(false);
			fetchPlayersInMatch();
			showToast("Stats saved.");
		} catch (error) {
			console.error("Error updating player stats:", error);
			showToast("Failed to save stats.", "error");
		}
	};

	const userInMatch = playersInMatch.some(
		(player) => player.player_id === playerId,
	);

	const handleJoinMatch = async () => {
		try {
			const playerStatsResponse = await privateApi.get(
				`/api/v1/players/${playerId}/stats`,
			);
			const { account_balance } = playerStatsResponse.data;

			if (account_balance < match.price) {
				showToast(
					`You need at least £${match.price} balance to join.`,
					"error",
				);
				window.location.href = "/your-account";
				return;
			}

			await privateApi.post("/api/v1/matchPlayer", {
				match_id: parseInt(match_id, 10),
				player_id: playerId,
				price: match.price,
				joined_at: new Date().toISOString(),
			});

			fetchPlayersInMatch();
			showToast("You've joined the match!");
		} catch (error) {
			console.error("Error joining match:", error);
			showToast("Failed to join the match. Please check your balance.", "error");
		}
	};

	const handleLeaveMatch = async () => {
		const matchResponse = await privateApi.get(`/api/v1/matches/${match_id}`);
		const matchData = matchResponse.data[0];
		const matchStartTime = parseISO(
			`${matchData.match_date.substring(0, 10)}T${matchData.match_time}`,
		);
		const timeDifference = differenceInHours(matchStartTime, new Date());

		const message =
			timeDifference < 5
				? `You are leaving less than 5 hours before kick-off. £${matchData.price} will be deducted from your balance. Are you sure?`
				: `Are you sure you want to leave this match?`;

		setModal({
			message,
			onConfirm: async () => {
				try {
					if (timeDifference < 5) {
						await privateApi.post(`/api/v1/payments/leave/${playerId}`, {
							matchData: {
								match_id: matchData.match_id,
								price: matchData.price,
							},
						});
					}
					await privateApi.delete("/api/v1/matchPlayer", {
						data: { match_id: parseInt(match_id, 10), player_id: playerId },
					});
					fetchPlayersInMatch();
				} catch (error) {
					console.error("Error leaving match:", error);
				}
			},
		});
	};

	const calculateTeamScore = (team, opponentOwnGoals) =>
		team.reduce((sum, player) => sum + player.goals, 0) +
		opponentOwnGoals.reduce((sum, player) => sum + player.own_goals, 0);

	useEffect(() => {
		if (!team1 || !team2) return;
		setTeam1Goals(calculateTeamScore(team1, team2));
		setTeam2Goals(calculateTeamScore(team2, team1));
	}, [team1, team2, match_id, playersInMatch]);

	if (!match || !pitch || playerId === null) {
		return <div className="spinner" />;
	}

	const handleManOfTheMatchChange = async (selectedPlayerId) => {
		try {
			await privateApi.put(`/api/v1/matches/${match_id}/manOfTheMatch`, {
				player_id: selectedPlayerId,
			});
			setManOfTheMatch(parseInt(selectedPlayerId, 10));
			showToast("Man of the match updated.");
		} catch (error) {
			console.error("Error updating man of the match:", error);
			showToast("Failed to update man of the match.", "error");
		}
	};

	const handleBalanceTeams = async () => {
		try {
			const response = await privateApi.get(
				`/api/v1/matchPlayer/attributes/${match_id}`,
			);
			const playersAttributes = response.data;

			// Warn about players whose attributes are all zero or missing.
			// Skip ID columns and team_id — anything else numeric is an attribute.
			const unrated = playersAttributes.filter((p) =>
				Object.entries(p)
					.filter(([k, v]) => typeof v === "number" && !k.endsWith("_id") && k !== "team_id")
					.every(([, v]) => !v || Number(v) === 0),
			);
			if (unrated.length > 0) {
				const names = unrated.map((p) => p.preferred_name || `${p.first_name} ${p.last_name}`).join(", ");
				showToast(`Unrated players — fix their attributes: ${names}`, "error");
			}

			const { team1, team2 } = randomiserMk3(playersAttributes);
			const team1Ids = team1.map((player) => player.player_id);
			const team2Ids = team2.map((player) => player.player_id);

			await privateApi.put(`/api/v1/matchPlayer/update-teams/${match_id}`, {
				team1: team1Ids,
				team2: team2Ids,
			});

			await fetchPlayersInMatch();
		} catch (error) {
			console.error("Error updating teams", error);
			showToast("Failed to balance teams.", "error");
		}
	};

	const handleDeleteMatch = () => {
		if (!isAdmin) return;
		setModal({
			message:
				"Are you sure you want to delete this match? This cannot be undone.",
			confirmText: "Delete",
			onConfirm: async () => {
				try {
					await Promise.all(
						playersInMatch.map((player) =>
							privateApi.delete("/api/v1/matchPlayer", {
								data: {
									match_id: parseInt(match_id, 10),
									player_id: player.player_id,
								},
							}),
						),
					);
					await privateApi.delete(`/api/v1/matches/${match_id}`);
					navigate("/");
				} catch (error) {
					console.error("Error deleting match:", error);
					showToast("Failed to delete match.", "error");
				}
			},
		});
	};

	const handleEmailAllPlayers = () => {
		setModal({
			message: "Send an email to all registered players?",
			confirmText: "Send",
			onConfirm: async () => {
				try {
					await privateApi.post(`/api/v1/matches/notify-all-players`);
					showToast("Emails sent successfully!");
				} catch (error) {
					console.error("Error sending emails:", error);
					showToast("Failed to send emails.", "error");
				}
			},
		});
	};

	return (
		<div className="page-content individual-match table-wrapper">
			<h1>{match.match_name}</h1>

			<div>
				{isAdmin && <button onClick={handleDeleteMatch}>Delete Match</button>}
				{isAdmin && <button onClick={handleBalanceTeams}>Balance Teams</button>}
				{isAdmin && (
					<button onClick={() => setEmailModal(true)}>Email Players</button>
				)}
			</div>
			{isAdmin && (
				<button onClick={handleEmailAllPlayers}>Email All Players</button>
			)}

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

			<div className="team-scores">
				<h2>
					Team 1 ({team1Goals}) - ({team2Goals}) Team 2
				</h2>
			</div>

			{/* Man of the Match */}
			<div className="man-of-the-match">
				<h3>Man of the Match</h3>
				{motmPlayer && (
					<div className="motm-card">
						<span className="motm-trophy">⭐</span>
						<span className="motm-name">{motmPlayer.preferred_name}</span>
					</div>
				)}
				{isAdmin && (
					<select
						value={manOfTheMatch || ""}
						onChange={(e) => handleManOfTheMatchChange(e.target.value)}
					>
						<option value="">Select Man of the Match</option>
						{playersInMatch.map((player) => (
							<option key={player.player_id} value={player.player_id}>
								{player.preferred_name}
							</option>
						))}
					</select>
				)}
				{!isAdmin && !motmPlayer && <p>Not yet selected.</p>}
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

			{modal && (
				<ConfirmModal
					message={modal.message}
					confirmText={modal.confirmText || "Confirm"}
					onConfirm={() => {
						modal.onConfirm();
						setModal(null);
					}}
					onCancel={() => setModal(null)}
				/>
			)}

			{emailModal && (
				<EmailModal
					matchId={match_id}
					showToast={showToast}
					onClose={() => setEmailModal(false)}
				/>
			)}

			{toast && (
				<div className={`toast toast--${toast.type}`}>{toast.message}</div>
			)}
		</div>
	);
}

function EmailModal({ matchId, showToast, onClose }) {
	const [message, setMessage] = useState("");
	const [sending, setSending] = useState(false);

	const templates = [
		`Reminder that you have joined tonight's game. Go to www.farhatfootball.co.uk/matches/${matchId} to confirm details. Teams may be subject to change.`,
		"Tonight's game has been CANCELLED. Sorry for any inconvenience.",
		`Kick-off time has changed — check www.farhatfootball.co.uk/matches/${matchId} for the latest details.`,
	];

	const handleSend = async () => {
		if (!message.trim()) return;
		setSending(true);
		try {
			await privateApi.post(`/api/v1/matches/${matchId}/notify-players`, {
				message,
			});
			showToast("Emails sent successfully!");
			onClose();
		} catch (error) {
			console.error("Error sending emails:", error);
			showToast("Failed to send emails.", "error");
		} finally {
			setSending(false);
		}
	};

	return (
		<div className="modal-overlay">
			<div className="modal-box email-modal">
				<h3>Email Players</h3>
				<div className="email-templates">
					{templates.map((t, i) => (
						<button key={i} className="template-btn" onClick={() => setMessage(t)}>
							Template {i + 1}
						</button>
					))}
				</div>
				<textarea
					className="email-textarea"
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					placeholder="Type your message or select a template above..."
					rows={5}
				/>
				<div className="modal-actions">
					<button
						className="modal-btn modal-btn--confirm"
						onClick={handleSend}
						disabled={sending || !message.trim()}
					>
						{sending ? "Sending..." : "Send"}
					</button>
					<button className="modal-btn modal-btn--cancel" onClick={onClose}>
						Cancel
					</button>
				</div>
			</div>
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
					<a href={match.youtube_links} target="_blank" rel="noopener noreferrer">
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
						setEditMatchFields({ ...editMatchFields, price: e.target.value })
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
		<div style={{ width: "100%" }}>
			{isAdmin && !isEditingStats && (
				<button onClick={() => setIsEditingStats(true)}>Edit Stats</button>
			)}
			{isAdmin && isEditingStats && (
				<button onClick={handleSavePlayerStats}>Save Stats</button>
			)}

			<div className="table-scroll">
				<table className="playerTable">
					<thead>
						<tr>
							<th>Name</th>
							<th>Goals</th>
							<th>Assists</th>
							<th>Defcons</th>
							<th>Key Passes</th>
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
													value={editData.defcons}
													onChange={(e) =>
														setEditedPlayerStats((prev) => ({
															...prev,
															[player.player_id]: {
																...prev[player.player_id],
																defcons: e.target.value,
															},
														}))
													}
												/>
											</td>
											<td>
												<input
													type="number"
													value={editData.chancescreated}
													onChange={(e) =>
														setEditedPlayerStats((prev) => ({
															...prev,
															[player.player_id]: {
																...prev[player.player_id],
																chancescreated: e.target.value,
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
													<option value="0">Reserves</option>
													<option value="1">1</option>
													<option value="2">2</option>
												</select>
											</td>
										</>
									) : (
										<>
											<td>{player.goals}</td>
											<td>{player.assists}</td>
											<td>{player.defcons}</td>
											<td>{player.chancescreated}</td>
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
		youtube_links: PropTypes.string,
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
		youtube_links: PropTypes.string,
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

EmailModal.propTypes = {
	matchId: PropTypes.string.isRequired,
	showToast: PropTypes.func.isRequired,
	onClose: PropTypes.func.isRequired,
};

PlayerTable.propTypes = {
	players: PropTypes.arrayOf(
		PropTypes.shape({
			player_id: PropTypes.number,
			preferred_name: PropTypes.string,
			goals: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
			assists: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
			defcons: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
			chancescreated: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
			own_goals: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
			late: PropTypes.bool,
			team_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		}),
	),
	isAdmin: PropTypes.bool,
	isEditingStats: PropTypes.bool,
	setIsEditingStats: PropTypes.func.isRequired,
	editedPlayerStats: PropTypes.objectOf(
		PropTypes.shape({
			goals: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
			assists: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
			defcons: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
			chancescreated: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
			own_goals: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
			late: PropTypes.bool,
			team_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		}),
	),
	setEditedPlayerStats: PropTypes.func.isRequired,
	handleSavePlayerStats: PropTypes.func.isRequired,
};

export default IndividualMatch;
