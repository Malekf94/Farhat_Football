import { useState } from "react";
import axios from "axios";
import "./CreateAccount.css";

function CreateAccount() {
	const [formData, setFormData] = useState({
		first_name: "",
		last_name: "",
		preferred_name: "",
		year_of_birth: "",
		height: "",
		weight: "",
		nationality: "",
		email: "",
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
			const response = await axios.post("/api/v1/players", formData);
			setMessage(
				`Account created successfully for ${response.data.preferred_name}!`
			);
			setFormData({
				first_name: "",
				last_name: "",
				preferred_name: "",
				year_of_birth: "",
				height: "",
				weight: "",
				nationality: "",
				email: "",
			});
		} catch (error) {
			setMessage("Error creating account. Please try again.");
			console.error(error);
		}
	};

	return (
		<div className="create-account-page">
			<h1>Create Account</h1>
			<form className="create-account-form" onSubmit={handleSubmit}>
				<label>
					First Name:
					<input
						type="text"
						name="first_name"
						value={formData.first_name}
						onChange={handleChange}
						required
					/>
				</label>
				<label>
					Last Name:
					<input
						type="text"
						name="last_name"
						value={formData.last_name}
						onChange={handleChange}
						required
					/>
				</label>
				<label>
					Preferred Name:
					<input
						type="text"
						name="preferred_name"
						value={formData.preferred_name}
						onChange={handleChange}
						required
					/>
				</label>
				<label>
					Year of Birth:
					<input
						type="number"
						name="year_of_birth"
						value={formData.year_of_birth}
						onChange={handleChange}
						required
					/>
				</label>
				<label>
					Height (meters):
					<input
						type="number"
						step="0.01"
						name="height"
						value={formData.height}
						onChange={handleChange}
						required
					/>
				</label>
				<label>
					Weight (kg):
					<input
						type="number"
						name="weight"
						value={formData.weight}
						onChange={handleChange}
						required
					/>
				</label>
				<label>
					Nationality:
					<input
						type="text"
						name="nationality"
						value={formData.nationality}
						onChange={handleChange}
						required
					/>
				</label>
				<label>
					Email Address:
					<input
						type="email"
						name="email"
						value={formData.email}
						onChange={handleChange}
						required
					/>
				</label>
				<button type="submit">Create Account</button>
			</form>
			{message && <p className="message">{message}</p>}
		</div>
	);
}

export default CreateAccount;
