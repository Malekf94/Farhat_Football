import { useAuth0 } from "@auth0/auth0-react";
import { Navigate } from "react-router-dom";
import PropTypes from "prop-types";
import { useCurrentPlayer } from "./hooks/useCurrentPlayer";

// Gates a route to superadmins only (Manage Hosts, editing shared attributes).
function ProtectedSuperAdminRoute({ children }) {
	const { isAuthenticated, isLoading: authLoading } = useAuth0();
	const { isSuperadmin, isLoading: playerLoading } = useCurrentPlayer();

	if (authLoading || playerLoading) {
		return <div className="spinner" />;
	}
	if (!isAuthenticated) {
		return <Navigate to="/login" />;
	}
	if (!isSuperadmin) {
		return <Navigate to="/" />;
	}
	return children;
}

ProtectedSuperAdminRoute.propTypes = {
	children: PropTypes.node.isRequired,
};

export default ProtectedSuperAdminRoute;
