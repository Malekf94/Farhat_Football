import { Link, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import "./Home.css";
import axios from "axios";

function Home() {
	const navigate = useNavigate();
	const { isAuthenticated, user } = useAuth0();
	const [isAdmin, setIsAdmin] = useState(false);

	useEffect(() => {
		if (isAuthenticated && user) {
			const checkAdmin = async () => {
				try {
					const response = await fetch(
						`/api/v1/players/check?email=${user.email}`
					);
					const data = await response.json();
					setIsAdmin(data.is_admin);
				} catch (error) {
					console.error("Error checking admin status:", error);
				}
			};
			checkAdmin();
		}
	}, [isAuthenticated, user]);

	return (
		<div className="page-content">
			<h1>Welcome to Farhat Football</h1>
			<p>
				Familiarise yourself with our group by checking our{" "}
				<Link to="/rules">Rules</Link> link at the top of the page.
			</p>
			<p>
				Once you have created an account, feel free to play in our upcoming
				games by clicking on Matches in the navigation bar.
			</p>
			<p>Games are on a pay before you play basis</p>
			<p>
				You can click on the logo in the top left corner to come back to this
				page
			</p>

			{/* Dropdown toggle for mobile */}

			<div className="buttons">
				<div className="btn-group">
					<h2>Core Features</h2>
					<button className="btn" onClick={() => navigate("/feedback")}>
						Feedback
					</button>
				</div>

				<div className="btn-group">
					<h2>Leaderboards</h2>
					<button className="btn" onClick={() => navigate("/leaderboard")}>
						Leaderboard
					</button>
					<button
						className="btn"
						onClick={() => navigate("/seasonal-leaderboard")}
					>
						Seasonal Leaderboard
					</button>
				</div>

				<div className="btn-group">
					<h2>Other Features</h2>
					<button className="btn" onClick={() => navigate("/lates")}>
						Name and Shame the Lame
					</button>
				</div>

				{isAdmin && (
					<div className="btn-group admin-group">
						<h2>Admin Features</h2>
						<button className="btn" onClick={() => navigate("/create-match")}>
							Create Match
						</button>
						<button className="btn" onClick={() => navigate("/add-pitch")}>
							Add Pitch
						</button>
						<button
							className="btn"
							onClick={() => navigate("/update-attributes")}
						>
							Update Player Attributes
						</button>
						<button
							className="btn"
							onClick={async () => {
								try {
									const response = await axios.get("/api/v1/payments/check");
									alert(response.data.message);
								} catch (error) {
									alert("Failed to check payments. Please try again.");
									console.error("Error checking payments:", error);
								}
							}}
						>
							Check Payments
						</button>
						<button
							className="btn"
							onClick={async () => {
								try {
									const response = await axios.get("/api/v1/payments/sync");
									alert(response.data.message);
								} catch (error) {
									alert("Failed to sync balances. Please try again.");
									console.error("Error syncing balances:", error);
								}
							}}
						>
							Sync Balances
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

export default Home;
