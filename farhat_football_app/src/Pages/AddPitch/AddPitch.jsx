import { useState } from "react";
import axios from "axios";
import "./AddPitch.css";

function AddPitch() {
	const [formData, setFormData] = useState({
		pitch_name: "",
		pitch_number: "",
		address: "",
		postcode: "",
		price: "",
	});
	const [message, setMessage] = useState("");

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData({ ...formData, [name]: value });
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setMessage("");

		try {
			await axios.post("/api/v1/pitches", formData);
			setMessage("Pitch added successfully!");
			setFormData({
				pitch_name: "",
				pitch_number: "",
				address: "",
				postcode: "",
				price: "",
			});
		} catch (error) {
			console.error("Error adding pitch:", error);
			setMessage("Failed to add pitch. Please try again.");
		}
	};

	return (
		<div className="page-content add-pitch">
			<h1>Add New Pitch</h1>
			<form className="add-pitch-form" onSubmit={handleSubmit}>
				<label>
					Pitch Name:
					<input
						type="text"
						name="pitch_name"
						value={formData.pitch_name}
						onChange={handleChange}
						required
					/>
				</label>
				<label>
					Pitch Number:
					<input
						type="number"
						name="pitch_number"
						value={formData.pitch_number}
						onChange={handleChange}
						required
					/>
				</label>
				<label>
					Address:
					<input
						type="text"
						name="address"
						value={formData.address}
						onChange={handleChange}
						required
					/>
				</label>
				<label>
					Postcode:
					<input
						type="text"
						name="postcode"
						value={formData.postcode}
						onChange={handleChange}
						required
					/>
				</label>
				<label>
					Price (£):
					<input
						type="number"
						step="0.01"
						name="price"
						value={formData.price}
						onChange={handleChange}
						required
					/>
				</label>
				<button type="submit">Add Pitch</button>
			</form>
			{message && <p className="message">{message}</p>}
		</div>
	);
}

export default AddPitch;
