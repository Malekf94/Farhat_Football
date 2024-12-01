import { useEffect, useState } from "react";
import "./Matches.css";
import axios from "axios";
import { Link } from "react-router-dom";

function Matches() {
	const [matches, setMatches] = useState([]);

	useEffect(() => {
		axios
			.get("/api/v1/matches/")
			.then((response) => {
				setMatches(response.data);
				console.log(response.data);
			})
			.catch((error) => {
				console.error("Error fetching players:", error);
			});
	}, []);
	return (
		<div className="Matches">
			<h1>Matches</h1>
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
