import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "./PlayerDetails.css";
import { privateApi, publicApi } from "../../api";
import { useAuth0 } from "@auth0/auth0-react";
import RadarChart, { computeRadarStats } from "../../components/RadarChart";

function PlayerDetails() {
	const [player, setPlayer] = useState(null);
	const [stats, setStats] = useState([]);
	const [attributes, setAttributes] = useState(null);
	const { player_id } = useParams();
	const { getAccessTokenSilently, isAuthenticated, isLoading } = useAuth0();

	useEffect(() => {
		if (isLoading || !isAuthenticated) return;

		const fetchData = async () => {
			try {
				const token = await getAccessTokenSilently();
				const headers = { Authorization: `Bearer ${token}` };

				const [playerRes, statsRes, attrsRes] = await Promise.all([
					privateApi.get(`/api/v1/players/${player_id}`, { headers }),
					privateApi.get(`/api/v1/players/${player_id}/monthlystats`, { headers }),
					publicApi.get(`/api/v1/attributes/${player_id}`),
				]);

				setPlayer(playerRes.data[0]);
				setStats(statsRes.data);
				setAttributes(attrsRes.data);
			} catch (error) {
				console.error(error);
			}
		};

		fetchData();
	}, [player_id, getAccessTokenSilently, isAuthenticated, isLoading]);

	if (!player) {
		return <div className="spinner" />;
	}

	const radarStats = computeRadarStats(attributes);

	return (
		<div className="page-content player-details">
			<h1>Profile of {player.preferred_name}</h1>

			<Link to="/compare" className="compare-link">
				Compare with another player →
			</Link>

			{radarStats && (
				<div className="radar-section">
					<RadarChart
						datasets={[{ label: player.preferred_name, color: "#ffcc00", stats: radarStats }]}
						size={260}
					/>
					<div className="radar-stat-labels">
						{radarStats.map((s) => (
							<div key={s.label} className="radar-stat-pill">
								<span className="radar-stat-key">{s.label}</span>
								<span className="radar-stat-val">{s.value}</span>
							</div>
						))}
					</div>
				</div>
			)}

			<div className="player-stats">
				<h2>Performance Stats</h2>
				{stats.length > 0 ? (
					<div style={{ width: "100%" }}>
						<div className="table-scroll">
							<table className="stats-table">
								<thead>
									<tr>
										<th>Month</th>
										<th>Year</th>
										<th>Goals</th>
										<th>Assists</th>
										<th>Defcons</th>
										<th>Chances Created</th>
										<th>Own Goals</th>
									</tr>
								</thead>
								<tbody>
									{stats.map((stat, index) => (
										<tr key={index}>
											<td>{stat.month}</td>
											<td>{stat.year}</td>
											<td>{stat.total_goals}</td>
											<td>{stat.total_assists}</td>
											<td>{stat.total_defcons}</td>
											<td>{stat.total_chancescreated}</td>
											<td>{stat.total_own_goals}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				) : (
					<p>No performance stats available.</p>
				)}
			</div>
		</div>
	);
}

export default PlayerDetails;
