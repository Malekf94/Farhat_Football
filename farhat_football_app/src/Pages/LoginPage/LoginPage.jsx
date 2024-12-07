import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";

function LoginPage({ onLoginSuccess }) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const navigate = useNavigate();

	const handleLogin = () => {
		// Simulate an API call for login
		if (email === "john.doe@gmail.com" && password === "password123") {
			const fakeToken = "abc123";
			onLoginSuccess(fakeToken);
		} else {
			alert("Invalid credentials");
		}
	};

	return (
		<div className="pageContainer">
			<h1>Login</h1>
			<form className="formContainer" onSubmit={(e) => e.preventDefault()}>
				<label htmlFor="email">Email:</label>
				<input
					type="email"
					id="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
				/>

				<label htmlFor="password">Password:</label>
				<input
					type="password"
					id="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
				/>

				<button type="button" onClick={handleLogin}>
					Login
				</button>
			</form>

			<div className="optionsContainer">
				<p>Do not have an account?</p>
				<button
					className="navigateButton"
					onClick={() => navigate("/create-account")}
				>
					Create Account
				</button>
			</div>
		</div>
	);
}

export default LoginPage;
