import { useEffect, useState } from "react";
import { privateApi } from "../../api";
import "./ManageHosts.css";

export default function ManageHosts() {
	const [hosts, setHosts] = useState([]);
	const [newHost, setNewHost] = useState({ name: "", slug: "" });
	const [msg, setMsg] = useState(null);
	const [admins, setAdmins] = useState({}); // host_id -> [admins]
	const [adminEmail, setAdminEmail] = useState({}); // host_id -> email input

	const fetchHosts = async () => {
		try {
			const res = await privateApi.get("/api/v1/hosts");
			setHosts(res.data);
		} catch (err) {
			console.error(err);
		}
	};

	useEffect(() => {
		fetchHosts();
	}, []);

	const flash = (type, text) => {
		setMsg({ type, text });
		setTimeout(() => setMsg(null), 4000);
	};

	const slugify = (name) =>
		name
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "");

	const handleCreate = async () => {
		if (!newHost.name || !newHost.slug) return;
		try {
			await privateApi.post("/api/v1/hosts", newHost);
			setNewHost({ name: "", slug: "" });
			flash("success", "Host created.");
			fetchHosts();
		} catch (err) {
			flash("error", err.response?.data?.error || "Failed to create host.");
		}
	};

	const loadAdmins = async (hostId) => {
		try {
			const res = await privateApi.get(`/api/v1/hosts/${hostId}/admins`);
			setAdmins((a) => ({ ...a, [hostId]: res.data }));
		} catch (err) {
			console.error(err);
		}
	};

	const handleAddAdmin = async (hostId) => {
		const email = adminEmail[hostId];
		if (!email) return;
		try {
			await privateApi.post(`/api/v1/hosts/${hostId}/admins`, { email });
			setAdminEmail((e) => ({ ...e, [hostId]: "" }));
			flash("success", "Admin added.");
			loadAdmins(hostId);
		} catch (err) {
			flash("error", err.response?.data?.error || "Failed to add admin.");
		}
	};

	const handleRemoveAdmin = async (hostId, playerId) => {
		try {
			await privateApi.delete(`/api/v1/hosts/${hostId}/admins/${playerId}`);
			loadAdmins(hostId);
		} catch (err) {
			flash("error", "Failed to remove admin.");
		}
	};

	const portalLink = (slug) => `${window.location.origin}/h/${slug}`;

	return (
		<div className="page-content manage-hosts">
			<h1>Manage Hosts</h1>

			{msg && <p className={`mh-msg mh-msg--${msg.type}`}>{msg.text}</p>}

			{/* Create host */}
			<div className="mh-create">
				<h2>Add a Host</h2>
				<div className="mh-create-form">
					<input
						type="text"
						placeholder="Group name (e.g. Sunday Legends)"
						value={newHost.name}
						onChange={(e) =>
							setNewHost((h) => ({
								name: e.target.value,
								slug: h.slug || slugify(e.target.value),
							}))
						}
					/>
					<input
						type="text"
						placeholder="slug (in the link)"
						value={newHost.slug}
						onChange={(e) =>
							setNewHost((h) => ({ ...h, slug: slugify(e.target.value) }))
						}
					/>
					<button onClick={handleCreate} disabled={!newHost.name || !newHost.slug}>
						Create
					</button>
				</div>
			</div>

			{/* Existing hosts */}
			<div className="mh-list">
				{hosts.map((host) => (
					<div key={host.host_id} className="mh-host">
						<div className="mh-host-head">
							<div>
								<span className="mh-host-name">{host.name}</span>
								<a
									className="mh-host-link"
									href={portalLink(host.slug)}
									target="_blank"
									rel="noreferrer"
								>
									{portalLink(host.slug)}
								</a>
							</div>
							<button
								className="mh-admins-btn"
								onClick={() => loadAdmins(host.host_id)}
							>
								Manage admins ({host.admin_count})
							</button>
						</div>

						{admins[host.host_id] && (
							<div className="mh-admins">
								<ul>
									{admins[host.host_id].map((a) => (
										<li key={a.player_id}>
											{a.preferred_name} ({a.email})
											<button
												className="mh-remove"
												onClick={() =>
													handleRemoveAdmin(host.host_id, a.player_id)
												}
											>
												remove
											</button>
										</li>
									))}
									{admins[host.host_id].length === 0 && <li>No admins yet.</li>}
								</ul>
								<div className="mh-add-admin">
									<input
										type="email"
										placeholder="admin's email"
										value={adminEmail[host.host_id] || ""}
										onChange={(e) =>
											setAdminEmail((s) => ({
												...s,
												[host.host_id]: e.target.value,
											}))
										}
									/>
									<button onClick={() => handleAddAdmin(host.host_id)}>
										Add admin
									</button>
								</div>
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
}
