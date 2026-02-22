import { useEffect, useState } from "react";
import "./Matches.css";
import axios from "axios";
import { Link } from "react-router-dom";

function Matches() {
	const [matches, setMatches] = useState([]);
	const [view, setView] = useState("pending"); // "completed", "pending", "friendly", or "in_progress"

	const [year, setYear] = useState(""); // "" means no filter
	const [month, setMonth] = useState(""); // "" means no filter
	const [loading, setLoading] = useState(false);
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const limit = 10;

	useEffect(() => {
		setLoading(true);

		axios
			.get("/api/v1/matches", {
				params: {
					status: view,
					year,
					month,
					page,
					limit,
				},
			})
			.then((response) => {
				setMatches(response.data.data);
				setTotal(response.data.total);
			})
			.catch((error) => {
				console.error("Error fetching matches:", error);
			})
			.finally(() => {
				setLoading(false);
			});
	}, [view, year, month, page]);

	const groupedMatches = matches.reduce((groups, match) => {
		const date = new Date(match.match_date);

		const monthYear = date.toLocaleString("default", {
			month: "long",
			year: "numeric",
		});

		if (!groups[monthYear]) {
			groups[monthYear] = [];
		}

		groups[monthYear].push(match);

		return groups;
	}, {});

	return (
		<div className="page-content">
			<h1>
				{view.replace("_", " ").charAt(0).toUpperCase() +
					view.replace("_", " ").slice(1)}{" "}
				Matches
			</h1>
			<div className="match-filters">
				<select
					value={year}
					onChange={(e) => {
						setYear(e.target.value);
						setPage(1);
					}}
				>
					<option value="">All Years</option>
					<option value="2025">2025</option>
					<option value="2026">2026</option>
				</select>

				<select
					value={month}
					onChange={(e) => {
						setMonth(e.target.value);
						setPage(1);
					}}
				>
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
					onClick={() => {
						setView("completed");
						setPage(1);
					}}
				>
					Completed
				</button>
				<button
					className={view === "pending" ? "active" : ""}
					onClick={() => {
						setView("pending");
						setPage(1);
					}}
				>
					Upcoming
				</button>
				<button
					className={view === "friendly" ? "active" : ""}
					onClick={() => {
						setView("friendly");
						setPage(1);
					}}
				>
					Friendly
				</button>
				<button
					className={view === "in_progress" ? "active" : ""}
					onClick={() => {
						setView("in_progress");
						setPage(1);
					}}
				>
					In Progress
				</button>
			</div>
			{loading && <p>Loading matches...</p>}

			{Object.keys(groupedMatches).map((monthYear) => (
				<div key={monthYear} className="month-group">
					<h3>{monthYear}</h3>

					<ul className="playerList">
						{groupedMatches[monthYear].map((match) => (
							<li key={match.match_id}>
								<Link to={`/matches/${match.match_id}`}>
									{match.match_name}
								</Link>
							</li>
						))}
					</ul>
				</div>
			))}

			<div className="pagination">
				<button
					disabled={page === 1}
					onClick={() => setPage((prev) => prev - 1)}
				>
					Previous
				</button>

				<span>
					Page {page} of {Math.ceil(total / limit)}
				</span>

				<button
					disabled={page >= Math.ceil(total / limit)}
					onClick={() => setPage((prev) => prev + 1)}
				>
					Next
				</button>
			</div>
		</div>
	);
}

export default Matches;
