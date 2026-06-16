import { useEffect, useState } from "react";
import { privateApi, publicApi } from "../../api";
import { useCurrentPlayer } from "../../hooks/useCurrentPlayer";
import "./PaymentsDashboard.css";

export default function PaymentsDashboard() {
	const { playerId, isAdmin } = useCurrentPlayer();
	const [payments, setPayments] = useState([]);
	const [summary, setSummary] = useState({});
	const [players, setPlayers] = useState([]);
	const [loading, setLoading] = useState(false);
	const [refund, setRefund] = useState({ player_id: "", amount: "", description: "" });
	const [refundMsg, setRefundMsg] = useState(null);

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

	useEffect(() => {
		fetchPayments();
		publicApi.get("/api/v1/players").then((res) => setPlayers(res.data));
	}, []);

	const runSync = async () => {
		try {
			setLoading(true);
			const res = await privateApi.get("/api/v1/payments/sync");
			alert(res.data.message);
			await fetchPayments();
		} catch (err) {
			alert("Sync failed");
		} finally {
			setLoading(false);
		}
	};

	const handleRefund = async () => {
		if (!refund.player_id || !refund.amount) return;
		try {
			setLoading(true);
			const res = await privateApi.post("/api/v1/payments/refund", {
				admin_id: playerId,
				player_id: Number(refund.player_id),
				amount: Number(refund.amount),
				description: refund.description || undefined,
			});
			setRefundMsg({ type: "success", text: res.data.message });
			setRefund({ player_id: "", amount: "", description: "" });
			await fetchPayments();
		} catch (err) {
			setRefundMsg({ type: "error", text: "Refund failed." });
		} finally {
			setLoading(false);
			setTimeout(() => setRefundMsg(null), 4000);
		}
	};

	return (
		<div className="page-content payments-dashboard">
			<h1>Payments Dashboard</h1>

			{/* Summary */}
			<div className="pd-summary">
				<div className="pd-stat">
					<span className="pd-stat-value">£{Number(summary.totalReceived || 0).toFixed(2)}</span>
					<span className="pd-stat-label">Total Received</span>
				</div>
				<div className="pd-stat">
					<span className="pd-stat-value">£{Number(summary.unprocessed || 0).toFixed(2)}</span>
					<span className="pd-stat-label">Unprocessed</span>
				</div>
				<div className="pd-stat">
					<span className="pd-stat-value">{summary.playersOwing || 0}</span>
					<span className="pd-stat-label">Players Owing</span>
				</div>
			</div>

			{/* Actions */}
			<div className="pd-actions">
				<button onClick={runSync} disabled={loading}>
					Run Sync
				</button>
			</div>

			{/* Refund form — admin only */}
			{isAdmin && <div className="pd-refund">
				<h2>Issue Refund</h2>
				<div className="pd-refund-form">
					<select
						value={refund.player_id}
						onChange={(e) => setRefund((r) => ({ ...r, player_id: e.target.value }))}
					>
						<option value="">Select player…</option>
						{players.map((p) => (
							<option key={p.player_id} value={p.player_id}>
								{p.preferred_name}
							</option>
						))}
					</select>
					<input
						type="number"
						min="0.01"
						step="0.01"
						placeholder="Amount (£)"
						value={refund.amount}
						onChange={(e) => setRefund((r) => ({ ...r, amount: e.target.value }))}
					/>
					<input
						type="text"
						placeholder="Reason (optional)"
						value={refund.description}
						onChange={(e) => setRefund((r) => ({ ...r, description: e.target.value }))}
					/>
					<button
						onClick={handleRefund}
						disabled={loading || !refund.player_id || !refund.amount}
					>
						Issue Refund
					</button>
				</div>
				{refundMsg && (
					<p className={`pd-refund-msg pd-refund-msg--${refundMsg.type}`}>
						{refundMsg.text}
					</p>
				)}
			</div>}

			{/* Payments table */}
			<div className="pd-table-wrap">
				<table className="pd-table">
					<thead>
						<tr>
							<th>Player</th>
							<th>Amount</th>
							<th>Date</th>
							<th>Description</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody>
						{payments.map((p) => (
							<tr
								key={p.payment_id}
								className={Number(p.amount) < 0 ? "pd-row--debit" : "pd-row--credit"}
							>
								<td>{p.player_name || "Unknown"}</td>
								<td>£{Number(p.amount).toFixed(2)}</td>
								<td>{new Date(p.payment_date).toLocaleDateString("en-GB")}</td>
								<td>{p.description || "—"}</td>
								<td>{p.processed ? "✅" : "❌"}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{loading && <div className="spinner" />}
		</div>
	);
}
