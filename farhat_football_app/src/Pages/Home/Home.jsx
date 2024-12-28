import { Link, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import "./Home.css";

function Home() {
	const navigate = useNavigate();
	const { isAuthenticated, user } = useAuth0();
	const [isAdmin, setIsAdmin] = useState(false);

	useEffect(() => {
		if (isAuthenticated && user) {
			// Fetch admin status
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
				Familiarize yourself with our group by checking our rules in the{" "}
				<Link to="/rules">Rules</Link> link at the top of the page. Once you
				have created an account, feel free to play in our upcoming games by
				clicking the button below.
			</p>

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
					</div>
				)}
			</div>
		</div>
	);
}

export default Home;
