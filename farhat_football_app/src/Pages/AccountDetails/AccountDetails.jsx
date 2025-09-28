import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth0 } from "@auth0/auth0-react";
import "./AccountDetails.css";

function AccountDetails() {
	const { user, isAuthenticated, isLoading } = useAuth0(); // Auth0 hook to access logged-in user details
	const [playerId, setPlayerId] = useState(null);
	const [userDetails, setUserDetails] = useState(null);
	const [playerStats, setPlayerStats] = useState([]);
	const [attributes, setAttributes] = useState({});
	const [showAttributes, setShowAttributes] = useState(false); // Toggle to show attributes
	const [showEditForm, setShowEditForm] = useState(false);
	const [paymentHistory, setPaymentHistory] = useState([]);

	useEffect(() => {
		const fetchPlayerId = async () => {
			if (isAuthenticated && user) {
				try {
					const response = await axios.get(
						`/api/v1/players/check?email=${user.email}`
					);
					if (response.data.exists) {
						setPlayerId(response.data.player_id);
					} else {
						console.error("Player not found in the database.");
					}
				} catch (error) {
					console.error("Error fetching player ID:", error);
				}
			}
		};

		fetchPlayerId();
	}, [isAuthenticated, user]);

	// Fetch player details, stats, and attributes when playerId is available
	useEffect(() => {
		if (!playerId) return;

		// Fetch player details
		axios
			.get(`/api/v1/players/owndetails/${playerId}`)
			.then((response) => setUserDetails(response.data[0]))
			.catch((error) => console.error("Error fetching user details:", error));

		// Fetch player stats
		axios
			.get(`/api/v1/players/${playerId}/stats`)
			.then((response) => setPlayerStats(response.data))
			.catch((error) => console.error("Error fetching player stats:", error));

		// Fetch player attributes
		axios
			.get(`/api/v1/attributes/${playerId}`)
			.then((response) => setAttributes(response.data))
			.catch((error) =>
				console.error("Error fetching player attributes:", error)
			);
		axios
			.get(`/api/v1/players/${playerId}/payments`)
			.then((response) => setPaymentHistory(response.data))
			.catch((error) =>
				console.error("Error fetching payment history:", error)
			);
	}, [playerId]);

	// Edit Handlers
	const handleChange = (e) => {
		const { name, value } = e.target;
		setUserDetails((prevDetails) => ({
			...prevDetails,
			[name]: value,
		}));
	};

	const handleSave = () => {
		axios
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
		// Trigger Axios requests after 90 seconds
		setTimeout(() => {
			axios.get("/api/v1/payments/check");

			// Then wait another 5 seconds before the second request
			setTimeout(() => {
				axios.get("/api/v1/payments/sync");
			}, 5000); // 5-second delay
		}, 10000); // 10-second delay

		// Open Monzo payment link
		const monzoLink = `https://monzo.me/malekfarhat/1?d=ffc${playerId}`;
		window.open(monzoLink, "_blank");
	};

	if (isLoading) {
		return <p>Loading...</p>;
	}

	if (!playerId || !userDetails) {
		return <p>Loading your account details...</p>;
	}

	return (
		<div className="page-content AccountDetails">
			<h1>Hello {userDetails.preferred_name}</h1>

			{/* Update Details Form */}
			<button onClick={handlePayment} className="bg-blue-600 text-white">
				Update Balance
			</button>

			<button
				className="toggle-edit-btn"
				onClick={() => setShowEditForm(!showEditForm)}
			>
				{showEditForm ? "Cancel Update" : "Update Details"}
			</button>

			<div className="balance-section">
				<h2>Balance: £{Number(userDetails.account_balance).toFixed(2)}</h2>
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

			{/* Stats Section */}
			<div className="stats-section">
				<h2>Your Performance</h2>
				<table className="stats-table">
					<thead>
						<tr>
							<th>Month</th>
							<th>Year</th>
							<th>Goals</th>
							<th>Assists</th>
							<th>Own Goals</th>
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
									<td>{stat.total_own_goals}</td>
								</tr>
							))
						) : (
							<tr>
								<td colSpan="5">No stats available</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			{/* Payment History Section */}
			<div className="payments-section">
				<h2>Your Payment History</h2>
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
								<td colSpan="2">No payment history available</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			{/* Attributes Toggle */}
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
