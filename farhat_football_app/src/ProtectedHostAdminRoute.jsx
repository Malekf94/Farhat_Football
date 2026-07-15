import { Navigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import PropTypes from "prop-types";
import { useHost } from "./context/HostContext";
import { useMyHosts } from "./hooks/useMyHosts";

// Gates a route to admins of the CURRENT portal's host (create-match, etc.).
function ProtectedHostAdminRoute({ children }) {
	const { isAuthenticated, isLoading: authLoading } = useAuth0();
	const { hostId, hostPath } = useHost();
	const { canAdminHost, isLoading: hostsLoading } = useMyHosts();

	if (authLoading || hostsLoading || hostId == null) {
		return <div className="spinner" />;
	}
	if (!isAuthenticated) {
		return <Navigate to="/login" />;
	}
	if (!canAdminHost(hostId)) {
		return <Navigate to={hostPath("/matches")} />;
	}
	return children;
}

ProtectedHostAdminRoute.propTypes = {
	children: PropTypes.node.isRequired,
};

export default ProtectedHostAdminRoute;
