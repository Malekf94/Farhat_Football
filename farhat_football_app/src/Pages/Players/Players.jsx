import "./Players.css";
import axios from "axios";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function Players() {
	const [players, setPlayers] = useState([]); // Original list of players
	const [filteredPlayers, setFilteredPlayers] = useState([]); // For displaying filtered results
	const [searchQuery, setSearchQuery] = useState(""); // For managing search input

	// Fetch players
	useEffect(() => {
		axios
			.get("/api/v1/players/")
			.then((response) => {
				setPlayers(response.data);
				setFilteredPlayers(response.data); // Initialize filtered list
			})
			.catch((error) => {
				console.error("Error fetching players:", error);
			});
	}, []);

	// Handle search input
	const handleSearch = (e) => {
		const query = e.target.value.toLowerCase();
		setSearchQuery(query);

		// Filter players based on first name or last name
		const filtered = players.filter(
			(player) =>
				player.first_name.toLowerCase().includes(query) ||
				player.last_name.toLowerCase().includes(query)
		);
		setFilteredPlayers(filtered);
	};

	return (
		<div className="page-content">
			<h1>Players</h1>

			{/* Search Input */}
			<div className="search-container">
				<input
					type="text"
					placeholder="Search players by name..."
					value={searchQuery}
					onChange={handleSearch}
					className="search-input"
				/>
			</div>

			{/* Players List */}
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
