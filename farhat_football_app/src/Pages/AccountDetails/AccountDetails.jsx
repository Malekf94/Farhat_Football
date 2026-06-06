import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import "./AccountDetails.css";
import { privateApi } from "../../api";
import { useCurrentPlayer } from "../../hooks/useCurrentPlayer";

function AccountDetails() {
	const { isLoading: authLoading } = useAuth0();
	const { playerId, isLoading: playerLoading } = useCurrentPlayer();
	const navigate = useNavigate();

	const [userDetails, setUserDetails] = useState(null);
	const [playerStats, setPlayerStats] = useState([]);
	const [attributes, setAttributes] = useState({});
	const [showAttributes, setShowAttributes] = useState(false);
	const [showEditForm, setShowEditForm] = useState(false);
	const [paymentHistory, setPaymentHistory] = useState([]);
	const [playerMatches, setPlayerMatches] = useState([]);
	const [careerStats, setCareerStats] = useState(null);

	useEffect(() => {
		if (!playerId) return;

		privateApi
			.get(`/api/v1/players/owndetails/${playerId}`)
			.then((response) => setUserDetails(response.data[0]))
			.catch((error) => console.error("Error fetching user details:", error));

		privateApi
			.get(`/api/v1/players/${playerId}/monthlystats`)
			.then((response) => setPlayerStats(response.data))
			.catch((error) => console.error("Error fetching player stats:", error));

		privateApi
			.get(`/api/v1/attributes/${playerId}`)
			.then((response) => setAttributes(response.data))
			.catch((error) =>
				console.error("Error fetching player attributes:", error),
			);

		privateApi
			.get(`/api/v1/players/${playerId}/payments`)
			.then((response) => setPaymentHistory(response.data))
			.catch((error) =>
				console.error("Error fetching payment history:", error),
			);

		privateApi
			.get(`/api/v1/players/${playerId}/matches`)
			.then((response) => setPlayerMatches(response.data))
			.catch((error) =>
				console.error("Error fetching player matches:", error),
			);

		privateApi
			.get(`/api/v1/players/${playerId}/career`)
			.then((response) => setCareerStats(response.data))
			.catch((error) =>
				console.error("Error fetching career stats:", error),
			);
	}, [playerId]);

	const handleChange = (e) => {
		const { name, value } = e.target;
		setUserDetails((prevDetails) => ({
			...prevDetails,
			[name]: value,
		}));
	};

	const handleSave = () => {
		privateApi
			.put(`/api/v1/players/${playerId}`, userDetails)
			.then(() => {
				alert("Account details updated successfully.");
				setShowEditForm(false);
			})
			.catch((error) => {
				console.error("Error updating account details:", error);
				alert("Failed to update account details.");
			});
	};

	const handlePayment = () => {
		if (!playerId) {
			alert("Player ID is missing.");
			return;
		}
		const monzoLink = `https://monzo.me/malekfarhat/4.5?d=ffc${playerId}`;
		window.open(monzoLink, "_blank");
	};

	const formatDate = (dateStr) =>
		new Date(dateStr).toLocaleDateString("en-GB", {
			weekday: "short",
			day: "numeric",
			month: "short",
			year: "numeric",
		});

	const formatTime = (timeStr) => {
		if (!timeStr) return "";
		const [hours, minutes] = timeStr.split(":");
		const h = parseInt(hours);
		return `${h % 12 || 12}:${minutes} ${h >= 12 ? "PM" : "AM"}`;
	};

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const upcomingMatch = playerMatches
		.filter((m) => new Date(m.match_date) >= today && m.match_status !== "completed")
		.sort((a, b) => new Date(a.match_date) - new Date(b.match_date))[0];

	const recentMatches = playerMatches
		.filter((m) => m.match_status === "completed")
		.slice(0, 5);

	if (authLoading || playerLoading) {
		return <p>Loading...</p>;
	}

	if (!playerId || !userDetails) {
		return <p>Loading your account details...</p>;
	}

	return (
		<div className="page-content AccountDetails">
			<h1>Hello {userDetails.preferred_name}</h1>

			{/* Balance */}
			<div className="balance-section">
				<h2>Balance: £{Number(userDetails.account_balance).toFixed(2)}</h2>
			</div>

			{/* Action buttons */}
			<div className="action-buttons">
				<button onClick={handlePayment}>Top Up Balance</button>
				<button
					className="toggle-edit-btn"
					onClick={() => setShowEditForm(!showEditForm)}
				>
					{showEditForm ? "Cancel" : "Update Details"}
				</button>
			</div>

			{showEditForm && (
				<div className="edit-form">
					<h2>Update Your Details</h2>
					<label>
						Preferred Name:
						<input
							type="text"
							name="preferred_name"
							value={userDetails.preferred_name}
							onChange={handleChange}
						/>
					</label>
					<label>
						Year of Birth:
						<input
							type="number"
							name="year_of_birth"
							value={userDetails.year_of_birth}
							onChange={handleChange}
						/>
					</label>
					<button onClick={handleSave}>Save</button>
				</div>
			)}

			{/* Career stat cards */}
			{careerStats && (
				<div className="career-stats-grid">
					<div className="stat-card">
						<span className="stat-value">{careerStats.total_matches}</span>
						<span className="stat-label">Games</span>
					</div>
					<div className="stat-card">
						<span className="stat-value">{careerStats.total_goals}</span>
						<span className="stat-label">Goals</span>
					</div>
					<div className="stat-card">
						<span className="stat-value">{careerStats.total_assists}</span>
						<span className="stat-label">Assists</span>
					</div>
					<div className="stat-card">
						<span className="stat-value">{careerStats.total_defcons}</span>
						<span className="stat-label">Defcons</span>
					</div>
				</div>
			)}

			{/* Upcoming match */}
			{upcomingMatch ? (
				<div className="upcoming-match-card">
					<h2>Your Next Match</h2>
					<p className="upcoming-date">{formatDate(upcomingMatch.match_date)}</p>
					{upcomingMatch.match_time && (
						<p className="upcoming-detail">
							{formatTime(upcomingMatch.match_time)}
						</p>
					)}
					{upcomingMatch.pitch_name && (
						<p className="upcoming-detail">{upcomingMatch.pitch_name}</p>
					)}
					{upcomingMatch.price && (
						<p className="upcoming-detail">£{upcomingMatch.price} per player</p>
					)}
					<button onClick={() => navigate(`/matches/${upcomingMatch.match_id}`)}>
						View Match
					</button>
				</div>
			) : (
				<div className="upcoming-match-card upcoming-match-empty">
					<p>No upcoming matches scheduled yet.</p>
				</div>
			)}

			{/* Recent matches */}
			{recentMatches.length > 0 && (
				<div className="stats-section">
					<h2>Recent Matches</h2>
					<table className="stats-table">
						<thead>
							<tr>
								<th>Date</th>
								<th>Venue</th>
								<th>G</th>
								<th>A</th>
								<th>DC</th>
							</tr>
						</thead>
						<tbody>
							{recentMatches.map((match) => (
								<tr
									key={match.match_id}
									className="clickable-row"
									onClick={() => navigate(`/matches/${match.match_id}`)}
								>
									<td>{formatDate(match.match_date)}</td>
									<td>{match.pitch_name || "—"}</td>
									<td>{match.goals}</td>
									<td>{match.assists}</td>
									<td>{match.defcons}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Monthly performance */}
			<div className="stats-section">
				<h2>Monthly Performance</h2>
				<table className="stats-table">
					<thead>
						<tr>
							<th>Month</th>
							<th>Year</th>
							<th>Goals</th>
							<th>Assists</th>
							<th>Defcons</th>
							<th>Chances</th>
							<th>OGs</th>
						</tr>
					</thead>
					<tbody>
						{playerStats.length > 0 ? (
							playerStats.map((stat, index) => (
								<tr key={index}>
									<td>{stat.month}</td>
									<td>{stat.year}</td>
									<td>{stat.total_goals}</td>
									<td>{stat.total_assists}</td>
									<td>{stat.total_defcons}</td>
									<td>{stat.total_chancescreated}</td>
									<td>{stat.total_own_goals}</td>
								</tr>
							))
						) : (
							<tr>
								<td colSpan="7">No stats available</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			{/* Payment history */}
			<div className="payments-section">
				<h2>Payment History</h2>
				<table className="payments-table">
					<thead>
						<tr>
							<th>Date</th>
							<th>Amount</th>
							<th>Description</th>
						</tr>
					</thead>
					<tbody>
						{paymentHistory.length > 0 ? (
							paymentHistory.map((payment) => (
								<tr key={payment.transaction_id}>
									<td>{new Date(payment.payment_date).toLocaleDateString()}</td>
									<td>£{payment.amount}</td>
									<td>{payment.description}</td>
								</tr>
							))
						) : (
							<tr>
								<td colSpan="3">No payment history available</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			{/* Attributes */}
			<div className="attributes-section">
				<button
					className="toggle-attributes-btn"
					onClick={() => setShowAttributes(!showAttributes)}
				>
					{showAttributes ? "Hide Attributes" : "Show Attributes"}
				</button>

				{showAttributes && (
					<table className="attributes-table">
						<thead>
							<tr>
								<th>Attribute</th>
								<th>Value</th>
							</tr>
						</thead>
						<tbody>
							{Object.entries(attributes).map(([attribute, value]) => (
								<tr key={attribute}>
									<td>{attribute.replace(/_/g, " ")}</td>
									<td>{value}</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
}

export default AccountDetails;
