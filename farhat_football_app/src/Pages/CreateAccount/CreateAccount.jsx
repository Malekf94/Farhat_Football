import { useAuth0 } from "@auth0/auth0-react";
import { useState, useEffect } from "react";
import axios from "axios";
import "./CreateAccount.css";

function CreateAccount() {
	const { loginWithRedirect, user, isAuthenticated } = useAuth0(); // Auth0 hook
	const [formData, setFormData] = useState({
		email: "",
		first_name: "",
		last_name: "",
		preferred_name: "",
		year_of_birth: "",
	});
	const [message, setMessage] = useState("");

	// Pre-fill the email field with the logged-in user's email
	useEffect(() => {
		if (isAuthenticated && user) {
			setFormData((prevData) => ({
				...prevData,
				email: user.email, // Auth0 user's email
			}));
		}
	}, [user, isAuthenticated]);

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData({ ...formData, [name]: value });
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setMessage("");

		try {
			// Save user to the players table via backend API
			await axios.post("/api/v1/players/auth0-signup", formData);

			// Trigger Auth0 signup flow
			await loginWithRedirect({
				appState: { returnTo: "/your-account" },
				authorizationParams: {
					screen_hint: "signup",
				},
			});

			setMessage("Account created successfully!");
		} catch (error) {
			setMessage("Error creating account. Please try again.");
			console.error(error);
		}
	};

	return (
		<div className="page-content">
			<h1>Create Account</h1>
			<form className="create-account-form" onSubmit={handleSubmit}>
				<label>
					Email Address:
					<input
						type="email"
						name="email"
						value={formData.email}
						readOnly // Email is hardcoded from Auth0
					/>
				</label>
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
				<button type="submit">Create Account</button>
			</form>
			{message && <p className="message">{message}</p>}
		</div>
	);
}

export default CreateAccount;
