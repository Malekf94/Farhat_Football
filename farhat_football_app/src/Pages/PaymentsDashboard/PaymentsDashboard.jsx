import { useEffect, useState } from "react";
import { privateApi } from "../../api";

export default function PaymentsDashboard() {
	const [payments, setPayments] = useState([]);
	const [summary, setSummary] = useState({});
	const [loading, setLoading] = useState(false);

	const fetchPayments = async () => {
		try {
			setLoading(true);

			const res = await privateApi.get("/api/v1/payments");
			setPayments(res.data.payments);
			setSummary(res.data.summary);
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	const runSync = async () => {
		try {
			setLoading(true);
			const res = await privateApi.get("/api/v1/payments/run");
			alert(res.data.message);
			await fetchPayments();
		} catch (err) {
			alert("Sync failed");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchPayments();
	}, []);

	return (
		<div className="p-4">
			<h1>💰 Payments Dashboard</h1>

			<button className="btn" onClick={runSync}>
				Run Payment Sync
			</button>

			{/* Summary */}
			<div className="grid">
				<div>Total Received: £{summary.totalReceived}</div>
				<div>Unprocessed: £{summary.unprocessed}</div>
				<div>Players Owing: {summary.playersOwing}</div>
			</div>

			{/* Table */}
			<table>
				<thead>
					<tr>
						<th>Player</th>
						<th>Amount</th>
						<th>Date</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					{payments.map((p) => (
						<tr
							key={p.payment_id}
							style={{
								backgroundColor: !p.user_id ? "#ffcccc" : "transparent",
							}}
						>
							<td>{p.player_name || "❌ Unknown"}</td>
							<td>£{p.amount}</td>
							<td>{new Date(p.payment_date).toLocaleDateString()}</td>
							<td>{p.processed ? "✅" : "❌"}</td>
						</tr>
					))}
				</tbody>
			</table>

			{loading && <p>Loading...</p>}
		</div>
	);
}
