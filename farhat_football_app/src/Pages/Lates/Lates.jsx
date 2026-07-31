import { useState, useEffect } from "react";
import { publicApi, privateApi } from "../../api";
import { useHost } from "../../context/HostContext";
import { useMyHosts } from "../../hooks/useMyHosts";
import "./Lates.css";

function Lates() {
	const { hostId } = useHost();
	const { canAdminHost } = useMyHosts();
	const isAdmin = canAdminHost(hostId);

	const [lates, setLates] = useState([]);
	const [negativeBalances, setNegativeBalances] = useState([]);
	const [bans, setBans] = useState([]);
	const [players, setPlayers] = useState([]);
	const [banForm, setBanForm] = useState({
		player_id: "",
		banned_until: "",
		reason: "",
	});
	const [msg, setMsg] = useState(null);

	const fetchBans = () => {
		publicApi
			.get("/api/v1/bans", { params: { host_id: hostId } })
			.then((r) => setBans(r.data))
			.catch((e) => console.error("Error fetching bans:", e));
	};

	useEffect(() => {
		if (!hostId) return;
		publicApi
			.get("/api/v1/matchPlayer/lates", { params: { host_id: hostId } })
			.then((r) => setLates(r.data))
			.catch((e) => console.error("Error fetching lates:", e));
		publicApi
			.get("/api/v1/players/negativeBalances")
			.then((r) => setNegativeBalances(r.data))
			.catch((e) => console.error("Error fetching balances:", e));
		fetchBans();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [hostId]);

	useEffect(() => {
		if (isAdmin) {
			publicApi
				.get("/api/v1/players")
				.then((r) => setPlayers(r.data))
				.catch((e) => console.error("Error fetching players:", e));
		}
	}, [isAdmin]);

	const flash = (type, text) => {
		setMsg({ type, text });
		setTimeout(() => setMsg(null), 4000);
	};

	const handleBan = async () => {
		if (!banForm.player_id || !banForm.banned_until) return;
		try {
			await privateApi.post("/api/v1/bans", {
				player_id: Number(banForm.player_id),
				host_id: hostId,
				banned_until: banForm.banned_until,
				reason: banForm.reason || undefined,
			});
			setBanForm({ player_id: "", banned_until: "", reason: "" });
			flash("success", "Player banned.");
			fetchBans();
		} catch (e) {
			flash("error", e.response?.data?.error || "Failed to ban player.");
		}
	};

	const handleLift = async (ban_id) => {
		try {
			await privateApi.post(`/api/v1/bans/${ban_id}/lift`);
			fetchBans();
		} catch {
			flash("error", "Failed to lift ban.");
		}
	};

	const fmtDate = (d) =>
		new Date(d).toLocaleDateString("en-GB", {
			day: "numeric",
			month: "short",
			year: "numeric",
		});

	const banReason = (b) =>
		b.reason || (b.ban_type === "auto_late" ? "Repeated lateness" : "—");

	return (
		<div className="page-content lates-page">
			<h1>Lates &amp; Bans</h1>
			{msg && <p className={`lb-msg lb-msg--${msg.type}`}>{msg.text}</p>}

			{/* Bans */}
			<details className="collapse" open>
				<summary>🚫 Banned Players ({bans.length})</summary>
				<div className="collapse-body">
					{isAdmin && (
						<div className="ban-form">
							<select
								value={banForm.player_id}
								onChange={(e) =>
									setBanForm((f) => ({ ...f, player_id: e.target.value }))
								}
							>
								<option value="">Select player…</option>
								{players.map((p) => (
									<option key={p.player_id} value={p.player_id}>
										{p.preferred_name}
									</option>
								))}
							</select>
							<label className="ban-until">
								Until
								<input
									type="date"
									value={banForm.banned_until}
									onChange={(e) =>
										setBanForm((f) => ({ ...f, banned_until: e.target.value }))
									}
								/>
							</label>
							<input
								type="text"
								placeholder="Reason (optional)"
								value={banForm.reason}
								onChange={(e) =>
									setBanForm((f) => ({ ...f, reason: e.target.value }))
								}
							/>
							<button
								onClick={handleBan}
								disabled={!banForm.player_id || !banForm.banned_until}
							>
								Ban
							</button>
						</div>
					)}

					{bans.length > 0 ? (
						<table className="latesTable">
							<thead>
								<tr>
									<th>Player</th>
									<th>Banned until</th>
									<th>Reason</th>
									{isAdmin && <th></th>}
								</tr>
							</thead>
							<tbody>
								{bans.map((b) => (
									<tr key={b.ban_id}>
										<td>{b.preferred_name}</td>
										<td>{fmtDate(b.banned_until)}</td>
										<td>{banReason(b)}</td>
										{isAdmin && (
											<td>
												<button
													className="lift-btn"
													onClick={() => handleLift(b.ban_id)}
												>
													Lift
												</button>
											</td>
										)}
									</tr>
								))}
							</tbody>
						</table>
					) : (
						<p className="empty">Nobody is banned right now.</p>
					)}
				</div>
			</details>

			{/* Lates */}
			<details className="collapse">
				<summary>⏱ Late Players ({lates.length})</summary>
				<div className="collapse-body">
					{lates.length > 0 ? (
						<table className="latesTable">
							<thead>
								<tr>
									<th>Date</th>
									<th>Player Name</th>
								</tr>
							</thead>
							<tbody>
								{lates.map((late, index) => (
									<tr key={index}>
										<td>{new Date(late.match_date).toLocaleDateString()}</td>
										<td>{late.full_name}</td>
									</tr>
								))}
							</tbody>
						</table>
					) : (
						<p className="empty">No late players.</p>
					)}
				</div>
			</details>

			{/* Negative balances */}
			<details className="collapse">
				<summary>💰 Negative Balances ({negativeBalances.length})</summary>
				<div className="collapse-body">
					{negativeBalances.length > 0 ? (
						<table className="negativeBalanceTable">
							<thead>
								<tr>
									<th>Player Name</th>
									<th>Balance</th>
								</tr>
							</thead>
							<tbody>
								{negativeBalances.map((player, index) => (
									<tr key={index}>
										<td>{player.full_name}</td>
										<td>£{player.account_balance}</td>
									</tr>
								))}
							</tbody>
						</table>
					) : (
						<p className="empty">No players with negative balances.</p>
					)}
				</div>
			</details>
		</div>
	);
}

export default Lates;
