import { useState } from "react";
import "./LoginPage.css";

function LoginPage({ onLoginSuccess }) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

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
		<div className="page-content">
			<h1>Login</h1>
			<label>
				Email:
				<input
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
				/>
			</label>
			<label>
				Password:
				<input
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
				/>
			</label>
			<button onClick={handleLogin}>Login</button>
		</div>
	);
}

export default LoginPage;
