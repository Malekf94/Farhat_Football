import { useAuth0 } from "@auth0/auth0-react";
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./CreateAccount.css";

function CreateAccount() {
	const { loginWithRedirect, user, isAuthenticated } = useAuth0();
	const location = useLocation();
	const navigate = useNavigate();
	const returnTo = location.state?.returnTo || "/your-account";
	const [formData, setFormData] = useState({
		email: location.state?.email || "",
		first_name: "",
		last_name: "",
		preferred_name: "",
		year_of_birth: "",
	});
	const [message, setMessage] = useState("");

	useEffect(() => {
		if (isAuthenticated && user?.email) {
			setFormData((prevData) => ({
				...prevData,
				email: user.email,
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
			await axios.post("/api/v1/players/auth0-signup", formData);

			if (isAuthenticated) {
				navigate(returnTo, { replace: true });
				return;
			}

			await loginWithRedirect({
				appState: { returnTo },
				authorizationParams: {
					screen_hint: "signup",
				},
			});
		} catch (error) {
			const apiError = error.response?.data?.error;
			setMessage(apiError || "Error creating account. Please try again.");
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
						min="1971"
						max="2008"
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
