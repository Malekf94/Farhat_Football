import { useEffect, useState } from "react";
import "./IndividualMatch.css";
import axios from "axios";
import { useParams } from "react-router-dom";

function IndividualMatch() {
	const [match, setMatch] = useState([]);
	const [playersInMatch, setPlayersInMatch] = useState([]);
	const { match_id } = useParams();
	useEffect(() => {
		axios
			.get(`/api/v1/matches/${match_id}`)
			.then((response) => {
				setMatch(response.data[0]);
				console.log(response.data[0]);
			})
			.catch((error) => {
				console.error("Error fetching players:", error);
			});
	}, [match_id]);

	useEffect(() => {
		axios
			.get(`/api/v1/matchPlayer/${match_id}`)
			.then((response) => {
				setPlayersInMatch(response.data);
				console.log(response.data);
			})
			.catch((error) => {
				console.error("Error fetching players:", error);
			});
	}, [match_id]);

	return (
		<div className="page-content">
			<h1>{match.match_name}</h1>
			<table className="playerTable">
				<thead>
					<tr>
						<th>Name</th>
						<th>Goals</th>
						<th>Assists</th>
						{/* <th>Own Goal</th> */}
						<th>Late</th>
					</tr>
				</thead>
				<tbody>
					{playersInMatch.map((player) => (
						<tr key={player.player_id}>
							<td>{player.preferred_name}</td>
							<td>{player.goals}</td>
							<td>{player.assists}</td>
							{/* <td>{player.own_goal ? "Yes" : "No"}</td> */}
							<td>{player.late ? "Yes" : "No"}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export default IndividualMatch;
