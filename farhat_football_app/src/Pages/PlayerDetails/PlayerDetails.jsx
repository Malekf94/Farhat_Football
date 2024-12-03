import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./PlayerDetails.css";

function PlayerDetails() {
	const [player, setPlayer] = useState([]);
	const { player_id } = useParams();

	useEffect(() => {
		axios
			.get(`/api/v1/players/${player_id}`)
			.then((response) => {
				setPlayer(response.data[0]);
				console.log(response.data[0]);
			})
			.catch((error) => {
				console.error("Error fetching players:", error);
			});
	}, [player_id]);
	return (
		<div className="page-content">
			<h1>Welcome to the page of {player.preferred_name} </h1>
			<h2>PS When are we going to play pro clubs</h2>
		</div>
	);
}

export default PlayerDetails;
