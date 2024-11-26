// import propTypes from "prop-types";
import "./Players.css";
import axios from "axios";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function Players() {
	useState;
	const [players, setPlayers] = useState([]);

	useEffect(() => {
		axios
			.get("/api/v1/players/")
			.then((response) => {
				setPlayers(response.data);
				console.log(response.data);
			})
			.catch((error) => {
				console.error("Error fetching players:", error);
			});
	}, []);
	return (
		<div className="playerPage">
			<h1>Players</h1>
			<ul className="playerList">
				{players.map((player) => (
					<li key={player.playerid}>
						<Link to={`/players/${player.playerid}`}>{player.player_name}</Link>
					</li>
				))}
			</ul>
		</div>
	);
}
export default Players;
