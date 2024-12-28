import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./CreateMatch.css";

function CreateMatch() {
	const navigate = useNavigate();
	const [pitches, setPitches] = useState([]);
	const [formData, setFormData] = useState({
		match_date: "",
		match_time: "",
		number_of_players: "",
		pitch_id: "",
		signin_begin_time: "",
		match_status: "pending", // default to pending
	});

	useEffect(() => {
		// Fetch the pitch data
		axios
			.get("/api/v1/pitches/")
			.then((response) => {
				setPitches(response.data);
			})
			.catch((error) => {
				console.error("Error fetching pitches:", error);
			});
	}, []);

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		// POST request to create match
		axios
			.post("/api/v1/matches", formData)
			.then((response) => {
				alert("Match created successfully!");
				navigate("/matches/pending"); // Redirect to pending matches
			})
			.catch((error) => {
				console.error("Error creating match:", error);
				alert("Failed to create match. Please try again.");
			});
	};

	return (
		<div className="page-content create-match-page">
			<h1>Create a Match</h1>
			<form className="create-match-form" onSubmit={handleSubmit}>
				<label>
					Date:
					<input
						type="date"
						name="match_date"
						value={formData.match_date}
						onChange={handleChange}
						required
					/>
				</label>

				<label>
					Time:
					<input
						type="time"
						name="match_time"
						value={formData.match_time}
						onChange={handleChange}
						required
					/>
				</label>

				<label>
					Number of Players:
					<input
						type="number"
						name="number_of_players"
						value={formData.number_of_players}
						onChange={handleChange}
						required
						min="1"
						placeholder="Enter number of players"
					/>
				</label>

				<label>
					Pitch:
					<select
						name="pitch_id"
						value={formData.pitch_id}
						onChange={handleChange}
						required
					>
						<option value="">Select a Pitch</option>
						{pitches.map((pitch) => (
							<option key={pitch.pitch_id} value={pitch.pitch_id}>
								{pitch.pitch_name} (Price: £{pitch.price})
							</option>
						))}
					</select>
				</label>
				<button type="submit">Create Match</button>
			</form>
		</div>
	);
}

export default CreateMatch;
