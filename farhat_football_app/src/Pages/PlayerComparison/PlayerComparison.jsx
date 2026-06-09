import { useState, useEffect } from "react";
import "./PlayerComparison.css";
import { publicApi } from "../../api";
import RadarChart, { computeRadarStats } from "../../components/RadarChart";

const ATTR_GROUPS = [
	{ label: "Pace", key: "pace" },
	{ label: "Finishing", key: "finishing" },
	{ label: "Long Shots", key: "long_shots" },
	{ label: "Short Passing", key: "short_passing" },
	{ label: "Long Passing", key: "long_passing" },
	{ label: "Vision", key: "vision" },
	{ label: "Dribbling", key: "dribbling" },
	{ label: "First Touch", key: "first_touch" },
	{ label: "Movement", key: "movement" },
	{ label: "Tackling", key: "tackling" },
	{ label: "Marking", key: "marking" },
	{ label: "Positioning", key: "positioning" },
	{ label: "Aggression", key: "aggression" },
	{ label: "Stamina", key: "stamina" },
	{ label: "Strength", key: "strength" },
	{ label: "Concentration", key: "concentration" },
	{ label: "Decision Making", key: "decision_making" },
	{ label: "Leadership", key: "leadership" },
	{ label: "Consistency", key: "consistency" },
	{ label: "Workrate", key: "workrate" },
	{ label: "Teamwork", key: "teamwork" },
	{ label: "Mental", key: "mental" },
	{ label: "Goalkeeping", key: "goalkeeping" },
];

function PlayerComparison() {
	const [players, setPlayers] = useState([]);
	const [p1Id, setP1Id] = useState("");
	const [p2Id, setP2Id] = useState("");
	const [attrs1, setAttrs1] = useState(null);
	const [attrs2, setAttrs2] = useState(null);

	useEffect(() => {
		publicApi.get("/api/v1/players").then((r) => setPlayers(r.data));
	}, []);

	useEffect(() => {
		if (!p1Id) return;
		publicApi
			.get(`/api/v1/attributes/${p1Id}`)
			.then((r) => setAttrs1(r.data))
			.catch(() => setAttrs1(null));
	}, [p1Id]);

	useEffect(() => {
		if (!p2Id) return;
		publicApi
			.get(`/api/v1/attributes/${p2Id}`)
			.then((r) => setAttrs2(r.data))
			.catch(() => setAttrs2(null));
	}, [p2Id]);

	const player1 = players.find((p) => String(p.player_id) === String(p1Id));
	const player2 = players.find((p) => String(p.player_id) === String(p2Id));

	const radar1 = computeRadarStats(attrs1);
	const radar2 = computeRadarStats(attrs2);

	const datasets = [
		...(radar1 ? [{ label: player1?.preferred_name || "Player 1", color: "#ffcc00", stats: radar1 }] : []),
		...(radar2 ? [{ label: player2?.preferred_name || "Player 2", color: "#00ccff", stats: radar2 }] : []),
	];

	const name1 = player1?.preferred_name || "Player 1";
	const name2 = player2?.preferred_name || "Player 2";

	return (
		<div className="page-content compare-page">
			<h1>Compare Players</h1>

			{/* Player selectors */}
			<div className="compare-selectors">
				<div className="compare-selector">
					<label>Player 1</label>
					<select value={p1Id} onChange={(e) => setP1Id(e.target.value)}>
						<option value="">Select player…</option>
						{players.map((p) => (
							<option key={p.player_id} value={p.player_id}>
								{p.preferred_name}
							</option>
						))}
					</select>
					{player1 && <span className="player-badge p1">{name1}</span>}
				</div>

				<div className="compare-vs">VS</div>

				<div className="compare-selector">
					<label>Player 2</label>
					<select value={p2Id} onChange={(e) => setP2Id(e.target.value)}>
						<option value="">Select player…</option>
						{players.map((p) => (
							<option key={p.player_id} value={p.player_id}>
								{p.preferred_name}
							</option>
						))}
					</select>
					{player2 && <span className="player-badge p2">{name2}</span>}
				</div>
			</div>

			{/* Radar chart */}
			{datasets.length > 0 && (
				<div className="compare-radar-wrap">
					<RadarChart datasets={datasets} size={280} />
					<div className="compare-legend">
						{datasets.map((d) => (
							<span key={d.label} className="legend-item">
								<span className="legend-dot" style={{ background: d.color }} />
								{d.label}
							</span>
						))}
					</div>
				</div>
			)}

			{/* Attribute comparison table */}
			{attrs1 && attrs2 && (
				<div className="compare-table-wrap" style={{ width: "100%" }}>
					<div className="table-scroll-compare">
						<table className="compare-table">
							<thead>
								<tr>
									<th className="attr-col">{name1}</th>
									<th className="label-col">Attribute</th>
									<th className="attr-col">{name2}</th>
								</tr>
							</thead>
							<tbody>
								{ATTR_GROUPS.map(({ label, key }) => {
									const v1 = Number(attrs1[key] || 0);
									const v2 = Number(attrs2[key] || 0);
									return (
										<tr key={key}>
											<td className={v1 > v2 ? "winner p1-val" : "p1-val"}>{v1}</td>
											<td className="label-col">{label}</td>
											<td className={v2 > v1 ? "winner p2-val" : "p2-val"}>{v2}</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{(p1Id && !attrs1) || (p2Id && !attrs2) ? (
				<p style={{ opacity: 0.6 }}>No attributes found for one of the selected players.</p>
			) : null}
		</div>
	);
}

export default PlayerComparison;
