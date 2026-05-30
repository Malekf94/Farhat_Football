import { useAuth0 } from "@auth0/auth0-react";
import { Navigate } from "react-router-dom";
import PropTypes from "prop-types";
import { useCurrentPlayer } from "./hooks/useCurrentPlayer";

function ProtectedAdminRoute({ children }) {
	const { isAuthenticated, isLoading: authLoading } = useAuth0();
	const { isAdmin, isLoading: playerLoading } = useCurrentPlayer();

	if (authLoading || playerLoading) {
		return <div>Loading...</div>;
	}

	if (!isAuthenticated) {
		return <Navigate to="/login" />;
	}

	if (!isAdmin) {
		return <Navigate to="/" />;
	}

	return children;
}

ProtectedAdminRoute.propTypes = {
	children: PropTypes.node.isRequired,
};

export default ProtectedAdminRoute;
