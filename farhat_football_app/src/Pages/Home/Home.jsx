import { useNavigate } from "react-router-dom";
import "./Home.css";
import { useCurrentPlayer } from "../../hooks/useCurrentPlayer";
import { useMyHosts } from "../../hooks/useMyHosts";
import { useHost } from "../../context/HostContext";
import { privateApi } from "../../api";

function Home() {
	const navigate = useNavigate();
	const { isAdmin, isSuperadmin } = useCurrentPlayer();
	const { canAdminHost } = useMyHosts();
	const { host, hostId, hostPath, isDefault } = useHost();

	const isHostAdmin = canAdminHost(hostId);

	return (
		<div className="page-content">
			<h1>{isDefault ? "Welcome to Farhat Football" : host?.name || "Football"}</h1>

			{isDefault && (
				<>
					<p>
						Familiarise yourself with our group by checking our Rules link at the
						top of the page. There is also a page for FAQs
					</p>
					<p>
						Once you have created an account, feel free to play in our upcoming
						games by clicking on Matches in the navigation bar.
					</p>
					<p>Games are on a pay before you play basis</p>
				</>
			)}

			<button className="btn" onClick={() => navigate(hostPath("/matches"))}>
				View Matches
			</button>

			<div className="buttons">
				<div className="btn-group">
					<h2>Leaderboards</h2>
					<button className="btn" onClick={() => navigate(hostPath("/leaderboard"))}>
						Monthly Leaderboard
					</button>
					<button
						className="btn"
						onClick={() => navigate(hostPath("/seasonal-leaderboard"))}
					>
						Seasonal Leaderboard
					</button>
					<button
						className="btn"
						onClick={() => navigate(hostPath("/eleven-aside-leaderboard"))}
					>
						11-a-side Leaderboard
					</button>
					<button
						className="btn"
						onClick={() => navigate("/attribute-leaderboard")}
					>
						Attribute Leaderboard
					</button>
				</div>

				<div className="btn-group">
					<h2>Other Features</h2>
					<button className="btn" onClick={() => navigate(hostPath("/lates"))}>
						Name and Shame the Lame
					</button>
				</div>

				{/* Host admin — managing this portal's games */}
				{isHostAdmin && (
					<div className="btn-group admin-group">
						<h2>Host Admin</h2>
						<button
							className="btn"
							onClick={() => navigate(hostPath("/create-match"))}
						>
							Create Match
						</button>
					</div>
				)}

				{/* Global admin features — only on the default site */}
				{isDefault && isAdmin && (
					<div className="btn-group admin-group">
						<h2>Admin Features</h2>
						<button className="btn" onClick={() => navigate("/add-pitch")}>
							Add Pitch
						</button>
						<button
							className="btn"
							onClick={async () => {
								try {
									const response = await privateApi.get("/api/v1/payments/run");
									alert(response.data.message);
								} catch (error) {
									alert("Failed to check payments. Please try again.");
									console.error("Error checking payments:", error);
								}
							}}
						>
							Run Payments
						</button>
						<button
							className="btn"
							onClick={() => navigate("/payment-dashboard")}
						>
							Payment Dashboard
						</button>
					</div>
				)}

				{/* Superadmin — shared resources */}
				{isDefault && isSuperadmin && (
					<div className="btn-group admin-group">
						<h2>Superadmin</h2>
						<button
							className="btn"
							onClick={() => navigate("/update-attributes")}
						>
							Update Player Attributes
						</button>
						<button className="btn" onClick={() => navigate("/manage-hosts")}>
							Manage Hosts
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

export default Home;
