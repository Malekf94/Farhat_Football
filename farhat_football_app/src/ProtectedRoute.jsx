import { useAuth0 } from "@auth0/auth0-react";
import PropTypes from "prop-types";
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

function ProtectedRoute({ children }) {
	const { isAuthenticated, isLoading, user } = useAuth0();
	const [checkingPlayer, setCheckingPlayer] = useState(true);
	const [hasPlayerAccount, setHasPlayerAccount] = useState(false);
	const [redirecting, setRedirecting] = useState(false); // Track redirection state

	useEffect(() => {
		const checkPlayerAccount = async () => {
			if (isAuthenticated && user) {
				try {
					// Check if the authenticated user has an account in the database
					const response = await axios.get(
						`/api/v1/players/check?email=${user.email}`
					);
					setHasPlayerAccount(response.data.exists); // true if the user has a player ID
				} catch (error) {
					console.error("Error checking player account:", error);
				} finally {
					setCheckingPlayer(false);
				}
			} else {
				setCheckingPlayer(false); // Not authenticated, no need to check further
			}
		};

		checkPlayerAccount();
	}, [isAuthenticated, user]);

	useEffect(() => {
		if (!checkingPlayer && !hasPlayerAccount && isAuthenticated) {
			// Wait 3 seconds before setting the redirecting state
			const timer = setTimeout(() => {
				setRedirecting(true);
			}, 3000);

			return () => clearTimeout(timer); // Clear timeout if component unmounts
		}
	}, [checkingPlayer, hasPlayerAccount, isAuthenticated]);

	if (isLoading || checkingPlayer) {
		// Show loading state while Auth0 or account verification is in progress
		return <div>Loading...</div>;
	}

	if (!isAuthenticated) {
		// Redirect to the login page if not authenticated
		return <Navigate to="/login" />;
	}

	if (!hasPlayerAccount && redirecting) {
		// Redirect to /create-account if the user doesn't have a player account
		return <Navigate to="/create-account" />;
	}

	if (!hasPlayerAccount && !redirecting) {
		// Show a message during the 3-second delay
		return <div>Please wait while we verify your account...</div>;
	}

	// Allow access to the protected route if authenticated and has a player account
	return children;
}

ProtectedRoute.propTypes = {
	children: PropTypes.node.isRequired,
};

export default ProtectedRoute;
