import { useEffect, useState } from "react";
import "./Matches.css";
import axios from "axios";
import { Link } from "react-router-dom";

function Matches() {
	const [matches, setMatches] = useState([]);
	const [view, setView] = useState("pending"); // "completed", "pending", "friendly", or "in_progress"

	const [year, setYear] = useState(""); // "" means no filter
	const [month, setMonth] = useState(""); // "" means no filter

	useEffect(() => {
		let endpoint = `/api/v1/matches/all/${view}`;

		const params = {};

		if (year) params.year = year;
		if (month) params.month = month;

		axios
			.get(endpoint, { params })
			.then((response) => {
				setMatches(response.data);
			})
			.catch((error) => {
				console.error(`Error fetching ${view} matches:`, error);
			});
	}, [view, year, month]);

	return (
		<div className="page-content">
			<h1>
				{view.replace("_", " ").charAt(0).toUpperCase() +
					view.replace("_", " ").slice(1)}{" "}
				Matches
			</h1>
			<div className="match-filters">
				<select value={year} onChange={(e) => setYear(e.target.value)}>
					<option value="">All Years</option>
					<option value="2024">2024</option>
					<option value="2025">2025</option>
				</select>

				<select value={month} onChange={(e) => setMonth(e.target.value)}>
					<option value="">All Months</option>
					<option value="1">January</option>
					<option value="2">February</option>
					<option value="3">March</option>
					<option value="4">April</option>
					<option value="5">May</option>
					<option value="6">June</option>
					<option value="7">July</option>
					<option value="8">August</option>
					<option value="9">September</option>
					<option value="10">October</option>
					<option value="11">November</option>
					<option value="12">December</option>
				</select>
			</div>

			<div className="match-toggle">
				<button
					className={view === "completed" ? "active" : ""}
					onClick={() => setView("completed")}
				>
					Completed
				</button>
				<button
					className={view === "pending" ? "active" : ""}
					onClick={() => setView("pending")}
				>
					Upcoming
				</button>
				<button
					className={view === "friendly" ? "active" : ""}
					onClick={() => setView("friendly")}
				>
					Friendly
				</button>
				<button
					className={view === "in_progress" ? "active" : ""}
					onClick={() => setView("in_progress")}
				>
					In Progress
				</button>
			</div>

			<ul className="playerList">
				{matches.map((match) => (
					<li key={match.match_id}>
						<Link to={`/matches/${match.match_id}`}>{match.match_name}</Link>
					</li>
				))}
			</ul>
		</div>
	);
}

export default Matches;
