import { Link, useNavigate } from "react-router-dom";
import "./Home.css";

function Home() {
	const navigate = useNavigate();

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
					<button className="btn" onClick={() => navigate("/create-match")}>
						Create Match
					</button>
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
			</div>
		</div>
	);
}

export default Home;
