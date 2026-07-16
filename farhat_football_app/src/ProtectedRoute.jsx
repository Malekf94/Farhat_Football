import { useAuth0 } from "@auth0/auth0-react";
import PropTypes from "prop-types";
import { Navigate, useLocation } from "react-router-dom";
import { useCurrentPlayer } from "./hooks/useCurrentPlayer";

function ProtectedRoute({ children }) {
	const { isAuthenticated, isLoading: authLoading } = useAuth0();
	const { playerExists, isLoading: playerLoading } = useCurrentPlayer();
	const location = useLocation();

	if (authLoading || playerLoading) {
		return <div className="spinner" />;
	}

	// Remember where they were heading (e.g. a match on a host portal) so we can
	// return them there after login instead of the home screen.
	const returnTo = `${location.pathname}${location.search}`;

	if (!isAuthenticated) {
		return <Navigate to="/login" state={{ returnTo }} replace />;
	}

	if (!playerExists) {
		return <Navigate to="/create-account" state={{ returnTo }} replace />;
	}

	return children;
}

ProtectedRoute.propTypes = {
	children: PropTypes.node.isRequired,
};

export default ProtectedRoute;
