import { useState, useEffect } from "react";
import axios from "axios";
import "./AccountDetails.css";

function AccountDetails() {
	const [userDetails, setUserDetails] = useState(null);
	const [playerStats, setPlayerStats] = useState([]);
	const [paymentHistory, setPaymentHistory] = useState([]);
	const [showEditForm, setShowEditForm] = useState(false);
	const playerId = 12; // Replace with actual player ID from authentication or props

	// Fetch all necessary data
	useEffect(() => {
		// Fetch player details
		axios
			.get(`/api/v1/players/${playerId}`)
			.then((response) => setUserDetails(response.data[0]))
			.catch((error) => console.error("Error fetching user details:", error));

		// Fetch player stats
		axios
			.get(`/api/v1/players/${playerId}/stats`)
			.then((response) => setPlayerStats(response.data))
			.catch((error) => console.error("Error fetching player stats:", error));

		// Fetch payment history
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

	// Top-Up Handlers
	const handleAddMoney = () => {
		axios
			.put(`/api/v1/players/balance/${playerId}`, {
				amount: 5,
				player_id: playerId,
			})
			.then(() => {
				alert("Money added successfully!");
				window.location.reload();
			})
			.catch((error) => {
				console.error("Error adding money:", error);
				alert("Failed to add money.");
			});
	};

	const handleTakeMoney = () => {
		axios
			.put(`/api/v1/players/balance/${playerId}`, {
				amount: -5,
				player_id: playerId,
			})
			.then(() => {
				alert("Money subtracted successfully!");
				window.location.reload();
			})
			.catch((error) => {
				console.error("Error subtracting money:", error);
				alert("Failed to subtract money.");
			});
	};

	if (!userDetails) {
		return <p>Loading your account details...</p>;
	}

	return (
		<div className="page-content AccountDetails">
			<h1>Hello {userDetails.preferred_name}</h1>

			{/* Balance Section */}
			<div className="balance-section">
				<h2>Balance: £{Number(userDetails.account_balance).toFixed(2)}</h2>
				<button onClick={handleAddMoney}>Add Money</button>
				<button onClick={handleTakeMoney}>Take Money</button>
			</div>

			{/* Update Details Form */}
			<button
				className="toggle-edit-btn"
				onClick={() => setShowEditForm(!showEditForm)}
			>
				{showEditForm ? "Cancel Update" : "Update Details"}
			</button>

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
								</tr>
							))
						) : (
							<tr>
								<td colSpan="4">No stats available</td>
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
								<td colSpan="3">No payment history available</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}

export default AccountDetails;
