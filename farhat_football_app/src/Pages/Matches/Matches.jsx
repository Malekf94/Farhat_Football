import { useEffect, useState } from "react";
import "./Matches.css";
import axios from "axios";
import { Link } from "react-router-dom";

function Matches() {
	const [matches, setMatches] = useState([]);
	const [view, setView] = useState("completed"); // "completed", "pending", "friendly", or "in_progress"

	useEffect(() => {
		const endpoint = `/api/v1/matches/${view}`;

		axios
			.get(endpoint)
			.then((response) => {
				setMatches(response.data);
			})
			.catch((error) => {
				console.error(`Error fetching ${view} matches:`, error);
			});
	}, [view]);

	return (
		<div className="page-content">
			<h1>
				{view.replace("_", " ").charAt(0).toUpperCase() +
					view.replace("_", " ").slice(1)}{" "}
				Matches
			</h1>

			<div className="match-toggle">
				<button
					className={view === "completed" ? "active" : ""}
					onClick={() => setView("completed")}
				>
					Completed
				</button>
				<button
					className={view === "pending" ? "active" : ""}
					onClick={() => setView("pending")}
				>
					Upcoming
				</button>
				<button
					className={view === "friendly" ? "active" : ""}
					onClick={() => setView("friendly")}
				>
					Friendly
				</button>
				<button
					className={view === "in_progress" ? "active" : ""}
					onClick={() => setView("in_progress")}
				>
					In Progress
				</button>
			</div>

			<ul className="playerList">
				{matches.map((match) => (
					<li key={match.match_id}>
						<Link to={`/matches/${match.match_id}`}>{match.match_name}</Link>
					</li>
				))}
			</ul>
		</div>
	);
}

export default Matches;
