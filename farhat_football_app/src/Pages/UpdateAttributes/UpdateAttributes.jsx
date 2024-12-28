import "./UpdateAttributes.css";
import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function UpdateAttributes() {
	const [players, setPlayers] = useState([]); // List of players
	const [selectedPlayerId, setSelectedPlayerId] = useState(null); // Selected player's ID
	const [attributes, setAttributes] = useState(null); // Attributes of the selected player
	const [searchQuery, setSearchQuery] = useState(""); // Search input
	const [filteredPlayers, setFilteredPlayers] = useState([]); // Filtered players list
	const navigate = useNavigate();

	// Fetch players on component mount
	useEffect(() => {
		axios
			.get("/api/v1/players/")
			.then((response) => {
				setPlayers(response.data);
				setFilteredPlayers(response.data); // Initialize filtered players list
			})
			.catch((error) => {
				console.error("Error fetching players:", error);
			});
	}, []);

	// Handle search input
	const handleSearch = (e) => {
		const query = e.target.value.toLowerCase();
		setSearchQuery(query);

		// Filter players based on name
		const filtered = players.filter(
			(player) =>
				player.first_name.toLowerCase().includes(query) ||
				player.last_name.toLowerCase().includes(query)
		);
		setFilteredPlayers(filtered);
	};

	// Fetch attributes when a player is selected
	const handleSelectPlayer = (playerId) => {
		setSelectedPlayerId(playerId);

		axios
			.get(`/api/v1/attributes/${playerId}`)
			.then((response) => {
				setAttributes(response.data);
			})
			.catch((error) => {
				console.error("Error fetching attributes:", error);
			});
	};

	// Handle attribute changes
	const handleAttributeChange = (e) => {
		const { name, value } = e.target;
		setAttributes((prevAttributes) => ({
			...prevAttributes,
			[name]: parseInt(value, 10), // Ensure value is a number
		}));
	};

	// Save updated attributes
	const handleSave = () => {
		axios
			.put(`/api/v1/attributes/${selectedPlayerId}`, attributes)
			.then(() => {
				alert("Attributes updated successfully!");
				navigate("/players"); // Navigate back to players list
			})
			.catch((error) => {
				console.error("Error updating attributes:", error);
				alert("Failed to update attributes.");
			});
	};

	return (
		<div className="page-content update-attributes">
			<h1>Update Player Attributes</h1>

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

			{/* Player List */}
			{!selectedPlayerId ? (
				<ul className="playerList">
					{filteredPlayers.length > 0 ? (
						filteredPlayers.map((player) => (
							<li
								key={player.player_id}
								onClick={() => handleSelectPlayer(player.player_id)}
								className="player-list-item"
							>
								{player.preferred_name}
							</li>
						))
					) : (
						<p>No players found</p>
					)}
				</ul>
			) : (
				<div className="attributes-form">
					<h2>Editing Attributes </h2>
					{attributes ? (
						<div className="attributes-grid">
							{attributes &&
								Object.keys(attributes)
									.filter((attr) => attr !== "player_id") // Exclude player_id
									.map((attr) => (
										<div key={attr} className="attribute-item">
											<label>
												{attr.replace("_", " ").toUpperCase()}:
												<input
													type="number"
													name={attr}
													value={attributes[attr]}
													onChange={handleAttributeChange}
													min="0"
													max="100"
												/>
											</label>
										</div>
									))}
						</div>
					) : (
						<p>Loading attributes...</p>
					)}
					<div className="actions">
						<button onClick={handleSave}>Save</button>
						<button onClick={() => setSelectedPlayerId(null)}>Cancel</button>
					</div>
				</div>
			)}
		</div>
	);
}

export default UpdateAttributes;
