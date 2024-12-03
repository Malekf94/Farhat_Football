import axios from "axios";
import { useEffect, useState } from "react";

function UpcomingMatch() {
	const [pendingMatches, setPendingMatches] = useState([]);

	useEffect(() => {
		axios
			.get("/api/v1/matches/pending")
			.then((response) => {
				setPendingMatches(response.data);
			})
			.catch((error) => {
				console.error("Error fetching pending matches:", error);
			});
	}, [pendingMatches]);
	return <div className="page-content"></div>;
}

export default UpcomingMatch;
