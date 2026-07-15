import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { privateApi } from "../api";

// Returns the hosts the logged-in player can administer.
// (Backend already folds in the default host for global admins and every host
// for superadmins.) Used to decide whether to show admin controls in a portal.
export function useMyHosts() {
	const { isAuthenticated, isLoading: authLoading } = useAuth0();
	const [myHosts, setMyHosts] = useState([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		if (authLoading) return;
		if (!isAuthenticated) {
			setMyHosts([]);
			setIsLoading(false);
			return;
		}
		privateApi
			.get("/api/v1/hosts/mine")
			.then((res) => setMyHosts(res.data))
			.catch((err) => console.error("Error fetching my hosts:", err))
			.finally(() => setIsLoading(false));
	}, [isAuthenticated, authLoading]);

	// Convenience: can the caller admin a given host_id?
	const canAdminHost = (hostId) =>
		hostId != null && myHosts.some((h) => h.host_id === hostId);

	return { myHosts, canAdminHost, isLoading };
}
