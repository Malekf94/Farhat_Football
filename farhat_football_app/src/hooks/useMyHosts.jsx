import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { privateApi } from "../api";

// Returns the portals relevant to the logged-in player: ones they administer
// AND ones they've played in. Each host carries `can_admin`.
//   myHosts      -> everything they can navigate to (portal switcher)
//   canAdminHost -> ONLY the ones they actually administer (admin controls)
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

	// Can the caller ADMIN this host? Must check can_admin — the list also
	// contains portals they've merely played in.
	const canAdminHost = (hostId) =>
		hostId != null &&
		myHosts.some((h) => h.host_id === hostId && h.can_admin === true);

	return { myHosts, canAdminHost, isLoading };
}
