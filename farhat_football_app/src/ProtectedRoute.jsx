import { useAuth0 } from "@auth0/auth0-react";
import PropTypes from "prop-types";
import { Navigate } from "react-router-dom";
import { useCurrentPlayer } from "./hooks/useCurrentPlayer";

function ProtectedRoute({ children }) {
	const { isAuthenticated, isLoading: authLoading } = useAuth0();
	const { playerExists, isLoading: playerLoading } = useCurrentPlayer();

	if (authLoading || playerLoading) {
		return <div>Loading...</div>;
	}

	if (!isAuthenticated) {
		return <Navigate to="/login" />;
	}

	if (!playerExists) {
		return <Navigate to="/create-account" />;
	}

	return children;
}

ProtectedRoute.propTypes = {
	children: PropTypes.node.isRequired,
};

export default ProtectedRoute;
