import { useState, useEffect } from "react";
import axios from "axios";
import "./AccountDetails.css";

function AccountDetails() {
	const [userDetails, setUserDetails] = useState(null);
	const [playerStats, setPlayerStats] = useState([]);
	const playerId = 12; // Replace with actual player ID from authentication or props

	useEffect(() => {
		// Fetch player details
		axios
			.get(`/api/v1/players/${playerId}`)
			.then((response) => {
				setUserDetails(response.data);
			})
			.catch((error) => {
				console.error("Error fetching user details:", error);
			});

		// Fetch player stats
		axios
			.get(`/api/v1/players/${playerId}/stats`)
			.then((response) => {
				setPlayerStats(response.data);
			})
			.catch((error) => {
				console.error("Error fetching player stats:", error);
			});
	}, [playerId]);

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
			})
			.catch((error) => {
				console.error("Error updating account details:", error);
				alert("Failed to update account details.");
			});
	};

	if (!userDetails) {
		return <p>Loading your account details...</p>;
	}

	return (
		<div className="page-content account-details">
			<h1>Your Account</h1>

			<div className="details-section">
				<label>
					First Name:
					<input
						type="text"
						name="first_name"
						value={userDetails.first_name}
						onChange={handleChange}
					/>
				</label>
				<label>
					Last Name:
					<input
						type="text"
						name="last_name"
						value={userDetails.last_name}
						onChange={handleChange}
					/>
				</label>
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
				<label>
					Height (m):
					<input
						type="number"
						step="0.01"
						name="height"
						value={userDetails.height}
						onChange={handleChange}
					/>
				</label>
				<label>
					Weight (kg):
					<input
						type="number"
						name="weight"
						value={userDetails.weight}
						onChange={handleChange}
					/>
				</label>
				<label>
					Nationality:
					<input
						type="text"
						name="nationality"
						value={userDetails.nationality}
						onChange={handleChange}
					/>
				</label>
				<label>
					Email:
					<input
						type="email"
						name="email"
						value={userDetails.email}
						onChange={handleChange}
					/>
				</label>
				<button onClick={handleSave}>Save</button>
			</div>

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
		</div>
	);
}

export default AccountDetails;
