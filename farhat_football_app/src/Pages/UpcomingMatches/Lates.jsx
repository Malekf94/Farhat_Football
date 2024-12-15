import { useState, useEffect } from "react";
import axios from "axios";
import "./Lates.css";

function Lates() {
	const [lates, setLates] = useState([]);

	useEffect(() => {
		axios
			.get("/api/v1/matchPlayer/lates")
			.then((response) => {
				setLates(response.data);
			})
			.catch((error) => {
				console.error("Error fetching lates:", error);
			});
	}, []);

	return (
		<div className="page-content">
			<h1>Late Players</h1>
			<table className="latesTable">
				<thead>
					<tr>
						<th>Date</th>
						<th>Player Name</th>
					</tr>
				</thead>
				<tbody>
					{lates.length > 0 ? (
						lates.map((late, index) => (
							<tr key={index}>
								<td>{new Date(late.match_date).toLocaleDateString()}</td>
								<td>{late.full_name}</td>
							</tr>
						))
					) : (
						<tr>
							<td colSpan="2">No late players found</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
}

export default Lates;
