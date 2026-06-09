import "./Players.css";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { publicApi } from "../../api";

function Players() {
	const [players, setPlayers] = useState([]);
	const [filteredPlayers, setFilteredPlayers] = useState([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const navigate = useNavigate();

	useEffect(() => {
		publicApi
			.get("/api/v1/players/")
			.then((response) => {
				setPlayers(response.data);
				setFilteredPlayers(response.data);
			})
			.catch((err) => {
				console.error("Error fetching players:", err);
				setError("Failed to load players. Please refresh the page.");
			})
			.finally(() => setIsLoading(false));
	}, []);

	const handleSearch = (e) => {
		const query = e.target.value.toLowerCase();
		setSearchQuery(query);
		setFilteredPlayers(
			players.filter(
				(player) =>
					player.first_name.toLowerCase().includes(query) ||
					player.last_name.toLowerCase().includes(query),
			),
		);
	};

	if (isLoading)
		return (
			<div className="page-content">
				<div className="spinner" />
			</div>
		);
	if (error)
		return (
			<div className="page-content">
				<p style={{ color: "red" }}>{error}</p>
			</div>
		);

	return (
		<div className="page-content">
			<h1>Players</h1>
			<div className="search-container">
				<input
					type="text"
					placeholder="Search players by name..."
					value={searchQuery}
					onChange={handleSearch}
					className="search-input"
				/>
				<button className="compare-btn" onClick={() => navigate("/compare")}>
					Compare
				</button>
			</div>
			<ul className="playerList">
				{filteredPlayers.length > 0 ? (
					filteredPlayers.map((player) => (
						<li key={player.player_id}>
							<Link to={`/players/${player.player_id}`}>
								{player.preferred_name}
							</Link>
						</li>
					))
				) : (
					<p>No players found</p>
				)}
			</ul>
		</div>
	);
}

export default Players;
