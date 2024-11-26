import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

function PlayerDetails() {
	const [player, setPlayer] = useState([]);
	const { playerid } = useParams();

	useEffect(() => {
		axios
			.get(`/api/v1/players/${playerid}`)
			.then((response) => {
				setPlayer(response.data[0]);
				console.log(response.data[0]);
				console.log(player.player_name);
			})
			.catch((error) => {
				console.error("Error fetching players:", error);
			});
	}, []);
	return (
		<div className="playerPage">
			<h1>Welcome to the page of {player.player_name} </h1>
		</div>
	);
}

export default PlayerDetails;
