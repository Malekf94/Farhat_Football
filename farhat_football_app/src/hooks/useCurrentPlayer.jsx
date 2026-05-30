import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { privateApi } from "../api";

export function useCurrentPlayer() {
	const { isAuthenticated, isLoading: authLoading, user } = useAuth0();
	const [playerId, setPlayerId] = useState(null);
	const [isAdmin, setIsAdmin] = useState(false);
	const [playerExists, setPlayerExists] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		if (authLoading) return;

		if (!isAuthenticated || !user) {
			setIsLoading(false);
			return;
		}

		const fetchPlayer = async () => {
			try {
				const response = await privateApi.get(
					`/api/v1/players/check?email=${user.email}`,
				);
				if (response.data.exists) {
					setPlayerId(response.data.player_id);
					setIsAdmin(response.data.is_admin);
					setPlayerExists(true);
				} else {
					setPlayerExists(false);
				}
			} catch (err) {
				setError(err);
				console.error("Error fetching player info:", err);
			} finally {
				setIsLoading(false);
			}
		};

		fetchPlayer();
	}, [isAuthenticated, authLoading, user]);

	return { playerId, isAdmin, playerExists, isLoading, error };
}
