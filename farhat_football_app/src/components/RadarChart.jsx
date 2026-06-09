import PropTypes from "prop-types";

// Aggregates raw attribute object into 6 FIFA-style categories
export function computeRadarStats(attrs) {
	if (!attrs) return null;
	const avg = (...keys) =>
		Math.round(
			keys.reduce((s, k) => s + Number(attrs[k] || 0), 0) / keys.length,
		);
	return [
		{ label: "PAC", value: avg("pace") },
		{ label: "SHO", value: avg("finishing", "long_shots") },
		{ label: "PAS", value: avg("short_passing", "long_passing", "vision") },
		{ label: "DRI", value: avg("dribbling", "first_touch", "movement") },
		{ label: "DEF", value: avg("tackling", "marking", "positioning") },
		{ label: "PHY", value: avg("stamina", "strength", "aggression") },
	];
}

// datasets: [{ label, color, stats: [{label, value}] }]
function RadarChart({ datasets, size = 240, maxValue = 99 }) {
	const cx = size / 2;
	const cy = size / 2;
	const radius = size * 0.34;
	const N = datasets[0]?.stats.length || 6;

	const angleAt = (i) => (i * 2 * Math.PI) / N - Math.PI / 2;

	const pt = (i, value) => ({
		x: cx + (value / maxValue) * radius * Math.cos(angleAt(i)),
		y: cy + (value / maxValue) * radius * Math.sin(angleAt(i)),
	});

	const outerPt = (i) => ({
		x: cx + radius * 1.22 * Math.cos(angleAt(i)),
		y: cy + radius * 1.22 * Math.sin(angleAt(i)),
	});

	const gridLevels = [0.25, 0.5, 0.75, 1.0];

	return (
		<svg
			width={size}
			height={size}
			viewBox={`0 0 ${size} ${size}`}
			style={{ overflow: "visible" }}
		>
			{/* Grid rings */}
			{gridLevels.map((level, li) => {
				const pts = Array.from({ length: N }, (_, i) => {
					const p = pt(i, maxValue * level);
					return `${p.x},${p.y}`;
				}).join(" ");
				return (
					<polygon
						key={li}
						points={pts}
						fill="none"
						stroke="rgba(255,204,0,0.18)"
						strokeWidth="1"
					/>
				);
			})}

			{/* Axis lines */}
			{Array.from({ length: N }, (_, i) => {
				const outer = pt(i, maxValue);
				return (
					<line
						key={i}
						x1={cx}
						y1={cy}
						x2={outer.x}
						y2={outer.y}
						stroke="rgba(255,204,0,0.2)"
						strokeWidth="1"
					/>
				);
			})}

			{/* Data polygons */}
			{datasets.map((dataset, di) => {
				const pts = dataset.stats
					.map((s, i) => {
						const p = pt(i, s.value);
						return `${p.x},${p.y}`;
					})
					.join(" ");
				return (
					<polygon
						key={di}
						points={pts}
						fill={dataset.color + "40"}
						stroke={dataset.color}
						strokeWidth="2.5"
						strokeLinejoin="round"
					/>
				);
			})}

			{/* Dot markers on first dataset */}
			{datasets[0]?.stats.map((s, i) => {
				const p = pt(i, s.value);
				return (
					<circle
						key={i}
						cx={p.x}
						cy={p.y}
						r="3"
						fill={datasets[0].color}
					/>
				);
			})}

			{/* Labels */}
			{datasets[0]?.stats.map((s, i) => {
				const lp = outerPt(i);
				return (
					<text
						key={i}
						x={lp.x}
						y={lp.y}
						textAnchor="middle"
						dominantBaseline="middle"
						fill="white"
						fontSize="11"
						fontWeight="bold"
						fontFamily="Arial, sans-serif"
					>
						{s.label}
					</text>
				);
			})}
		</svg>
	);
}

RadarChart.propTypes = {
	datasets: PropTypes.arrayOf(
		PropTypes.shape({
			label: PropTypes.string,
			color: PropTypes.string.isRequired,
			stats: PropTypes.arrayOf(
				PropTypes.shape({
					label: PropTypes.string.isRequired,
					value: PropTypes.number.isRequired,
				}),
			).isRequired,
		}),
	).isRequired,
	size: PropTypes.number,
	maxValue: PropTypes.number,
};

export default RadarChart;
