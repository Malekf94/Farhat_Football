import { Link, useNavigate } from "react-router-dom";
import "./Home.css";

function Home() {
	const navigate = useNavigate();
	return (
		<div className="page-content">
			<h1>Welcome to Farhat Football</h1>
			<p>
				Familiarise yourself with our group by checking our rules in the{" "}
				<Link to="/rules">Rules</Link> link at the top of the page. Once you
				have created an account, feel free to play in our upcoming games by
				clicking the button below.
			</p>
			<div className="buttons">
				<button className="btn" onClick={() => navigate("/matches/pending")}>
					View Upcoming Games
				</button>
				<button className="btn" onClick={() => navigate("/contact")}>
					Contact Us
				</button>
			</div>
		</div>
	);
}

export default Home;
