import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { privateApi } from "../../api";
import "./RosterHistory.css";

const EVENT_LABELS = {
	joined: "Joined",
	left: "Left",
	match_deleted: "Match deleted",
};

const TEAM_LABELS = { 0: "Reserve", 1: "Team 1", 2: "Team 2" };

// occurred_at is an absolute instant (timestamptz); show it in UK time.
const formatUk = (instant) =>
	new Date(instant).toLocaleString("en-GB", {
		timeZone: "Europe/London",
		dateStyle: "medium",
		timeStyle: "short",
	});

function RosterHistory() {
	const [rows, setRows] = useState([]);
	const [total, setTotal] = useState(0);
	const [limit, setLimit] = useState(20);
	const [page, setPage] = useState(1);
	const [matchInput, setMatchInput] = useState("");
	const [playerInput, setPlayerInput] = useState("");
	const [filters, setFilters] = useState({ match_id: "", player: "" });
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		setLoading(true);
		privateApi
			.get("/api/v1/matchPlayer/events", { params: { page, ...filters } })
			.then((res) => {
				setRows(res.data.data);
				setTotal(res.data.total);
				setLimit(res.data.limit);
				setError(null);
			})
			.catch((err) => {
				console.error("Error loading roster history:", err);
				setError(err.response?.data?.error || "Failed to load roster history.");
			})
			.finally(() => setLoading(false));
	}, [page, filters]);

	const totalPages = Math.max(1, Math.ceil(total / limit));

	const applyFilters = (e) => {
		e.preventDefault();
		setPage(1);
		setFilters({ match_id: matchInput.trim(), player: playerInput.trim() });
	};

	const clearFilters = () => {
		setMatchInput("");
		setPlayerInput("");
		setPage(1);
		setFilters({ match_id: "", player: "" });
	};

	return (
		<div className="page-content roster-history">
			<h1>Roster History</h1>
			<p className="roster-history-sub">
				Every join and leave, newest first. Recorded from 29 Sept 2026; joins
				before that were backfilled, earlier leaves weren&apos;t recorded.
			</p>

			<form className="roster-history-filters" onSubmit={applyFilters}>
				<input
					type="text"
					inputMode="numeric"
					placeholder="Match ID"
					value={matchInput}
					onChange={(e) => setMatchInput(e.target.value)}
				/>
				<input
					type="text"
					placeholder="Player name or ID"
					value={playerInput}
					onChange={(e) => setPlayerInput(e.target.value)}
				/>
				<button type="submit">Search</button>
				<button type="button" onClick={clearFilters}>
					Clear
				</button>
			</form>

			{error && <p className="roster-history-error">{error}</p>}

			<div className="table-scroll">
				<table className="roster-history-table">
					<thead>
						<tr>
							<th>When (UK)</th>
							<th>Player</th>
							<th>Event</th>
							<th>Match</th>
							<th>Team</th>
						</tr>
					</thead>
					<tbody>
						{!loading && rows.length === 0 && (
							<tr>
								<td colSpan={5}>No events found.</td>
							</tr>
						)}
						{rows.map((r) => (
							<tr key={r.event_id}>
								<td>{formatUk(r.occurred_at)}</td>
								<td>
									<Link to={`/players/${r.player_id}`}>
										{r.preferred_name ?? `Player ${r.player_id}`}
									</Link>
								</td>
								<td>
									<span className={`event-badge event-${r.event}`}>
										{EVENT_LABELS[r.event] ?? r.event}
									</span>
								</td>
								<td>
									{r.match_date ? (
										<Link to={`/matches/${r.match_id}`}>
											#{r.match_id} · {r.match_date} {r.match_time?.slice(0, 5)}
										</Link>
									) : (
										`#${r.match_id} (deleted)`
									)}
								</td>
								<td>{TEAM_LABELS[r.team_id] ?? "—"}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<div className="pagination">
				<button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
					Previous
				</button>
				<span>
					Page {page} of {totalPages} · {total} events
				</span>
				<button
					disabled={page >= totalPages}
					onClick={() => setPage((p) => p + 1)}
				>
					Next
				</button>
			</div>
		</div>
	);
}

export default RosterHistory;
