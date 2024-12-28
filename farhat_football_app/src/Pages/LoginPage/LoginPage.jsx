import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function LoginPage() {
	const { loginWithRedirect, isAuthenticated, user, getAccessTokenSilently } =
		useAuth0();
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const navigate = useNavigate();

	useEffect(() => {
		const checkUserInDB = async () => {
			if (isAuthenticated && user) {
				try {
					setIsLoading(true);
					// Check if user exists in the database
					const response = await axios.get(
						`/api/v1/players/check?email=${user.email}`
					);

					if (response.data.exists) {
						// User exists, navigate to their account
						navigate("/your-account");
					} else {
						// User does not exist, navigate to CreateAccount page
						navigate("/create-account", {
							state: { email: user.email, name: user.name },
						});
					}
				} catch (error) {
					console.error("Error checking user in DB:", error);
					setErrorMessage("An error occurred. Please try again.");
				} finally {
					setIsLoading(false);
				}
			}
		};

		checkUserInDB();
	}, [isAuthenticated, user, navigate]);

	return (
		<div className="page-content login-page">
			<h1>Login</h1>
			{!isAuthenticated ? (
				<button onClick={() => loginWithRedirect()}>Login with Auth0</button>
			) : isLoading ? (
				<p>Loading...</p>
			) : errorMessage ? (
				<p className="error">{errorMessage}</p>
			) : (
				<div>
					<h2>Welcome, {user.name}!</h2>
					<p>Email: {user.email}</p>
				</div>
			)}
		</div>
	);
}

export default LoginPage;
