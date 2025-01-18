import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function LoginPage() {
	const { loginWithRedirect, isAuthenticated, user } = useAuth0();
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const navigate = useNavigate();

	// Generate PKCE parameters
	const generatePKCE = async () => {
		// Generate a random code_verifier
		const codeVerifier = Array.from(crypto.getRandomValues(new Uint8Array(32)))
			.map((value) => String.fromCharCode((value % 94) + 33)) // Generate random ASCII characters
			.join("");

		// Use Web Crypto API to create a SHA-256 hash
		const encoder = new TextEncoder();
		const data = encoder.encode(codeVerifier);
		const digest = await crypto.subtle.digest("SHA-256", data);

		// Convert the hash to a Base64 URL string
		const base64UrlEncode = (arrayBuffer) => {
			const uint8Array = new Uint8Array(arrayBuffer);
			return btoa(String.fromCharCode(...uint8Array))
				.replace(/\+/g, "-")
				.replace(/\//g, "_")
				.replace(/=+$/, "");
		};
		const codeChallenge = base64UrlEncode(digest);

		return { codeVerifier, codeChallenge };
	};

	// Handle login flow with authorization code exchange
	const handleLogin = async () => {
		try {
			// Generate PKCE
			const { codeVerifier, codeChallenge } = await generatePKCE();
			localStorage.setItem("pkce_code_verifier", codeVerifier);

			// Trigger Auth0 login with PKCE
			await loginWithRedirect({
				authorizationParams: {
					response_type: "code", // Get the authorization code
					code_challenge: codeChallenge,
					code_challenge_method: "S256",
				},
			});
		} catch (error) {
			console.error("Login failed:", error.message);
			setErrorMessage("An error occurred during login. Please try again.");
		}
	};

	useEffect(() => {
		// Exchange authorization code for tokens
		const exchangeCodeForTokens = async () => {
			const queryParams = new URLSearchParams(window.location.search);
			const code = queryParams.get("code");
			const codeVerifier = localStorage.getItem("pkce_code_verifier");

			if (code) {
				try {
					const response = await axios.post("/api/v1/auth/exchange", {
						code: code,
						code_verifier: codeVerifier,
					});
					const { access_token, id_token } = response.data;

					// Store tokens securely (use cookies in production)
					localStorage.setItem("access_token", access_token);
					localStorage.setItem("id_token", id_token);

					console.log("Tokens received and stored successfully.");
				} catch (error) {
					console.error("Token exchange failed:", error.message);
					setErrorMessage(
						"Failed to exchange authorization code. Please try again."
					);
				}
			}
		};

		exchangeCodeForTokens();
	}, []);

	useEffect(() => {
		// Check if the user is authenticated and exists in the database
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
			{!isAuthenticated ? (
				<button onClick={handleLogin}>Login with Auth0</button>
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
