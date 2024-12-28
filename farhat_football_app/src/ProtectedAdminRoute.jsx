import { useAuth0 } from "@auth0/auth0-react";
import { Navigate } from "react-router-dom";
import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import axios from "axios";

function ProtectedAdminRoute({ children }) {
	const { isAuthenticated, isLoading, user } = useAuth0();
	const [isAdmin, setIsAdmin] = useState(false);

	useEffect(() => {
		if (isAuthenticated) {
			const checkAdmin = async () => {
				try {
					const response = await axios.get(
						`/api/v1/players/check?email=${user.email}`
					);
					setIsAdmin(response.data.is_admin);
				} catch (error) {
					console.error("Error checking admin status:", error);
				}
			};
			checkAdmin();
		}
	}, [isAuthenticated, user?.email]);

	if (isLoading || isAdmin === false) {
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
