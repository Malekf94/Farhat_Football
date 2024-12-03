import axios from "axios";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function UpcomingMatches() {
	const [pendingMatches, setPendingMatches] = useState([]);

	useEffect(() => {
		axios
			.get("/api/v1/matches/pending")
			.then((response) => {
				setPendingMatches(response.data);
			})
			.catch((error) => {
				console.error("Error fetching pending matches:", error);
			});
	}, []);
	return (
		<div className="page-content">
			<h1>Upcoming Matches</h1>
			<ul className="playerList">
				{pendingMatches.map((match) => (
					<li key={match.match_id}>
						<Link to={`/matches/${match.match_id}`}>{match.match_name}</Link>
					</li>
				))}
			</ul>
		</div>
	);
}

export default UpcomingMatches;
