import Header from "./Pages/Header/Header.jsx";
import Matches from "./Pages/Matches/Matches.jsx";
import "./App.css";
import { Route, Routes } from "react-router-dom";
import Rules from "./Pages/Rules/Rules.jsx";
import Players from "./Pages/Players/Players.jsx";
import Home from "./Pages/Home/Home.jsx";
import PlayerDetails from "./Pages/PlayerDetails/PlayerDetails.jsx";
import IndividualMatch from "./Pages/IndividualMatch/IndividualMatch.jsx";
import CreateAccount from "./Pages/CreateAccount/CreateAccount.jsx";
import CreateMatch from "./Pages/CreateMatch/CreateMatch.jsx";
import Lates from "./Pages/Lates/Lates.jsx";
import LeaderBoard from "./Pages/LeaderBoard/LeaderBoard.jsx";
import SeasonalLeaderBoard from "./Pages/SeasonalLeaderBoard/SeasonalLeaderBoard.jsx";
import ElevenLeaderBoard from "./Pages/ElevenLeaderBoard/ElevenLeaderBoard.jsx";
import LoginPage from "./Pages/LoginPage/LoginPage.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import AccountDetails from "./Pages/AccountDetails/AccountDetails.jsx";
import ProtectedAdminRoute from "./ProtectedAdminRoute.jsx";
import ProtectedHostAdminRoute from "./ProtectedHostAdminRoute.jsx";
import ProtectedSuperAdminRoute from "./ProtectedSuperAdminRoute.jsx";
import UpdateAttributes from "./Pages/UpdateAttributes/UpdateAttributes.jsx";
import AddPitch from "./Pages/AddPitch/AddPitch.jsx";
import StatLeaderBoard from "./Pages/StatLeaderBoard/StatLeaderBoard.jsx";
import FAQ from "./Pages/FAQ/FAQ.jsx";
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect } from "react";
import { setupInterceptors } from "./api.jsx";
import PaymentsDashboard from "./Pages/PaymentsDashboard/PaymentsDashboard.jsx";
import PlayerComparison from "./Pages/PlayerComparison/PlayerComparison.jsx";
import ManageHosts from "./Pages/ManageHosts/ManageHosts.jsx";
import HostLayout from "./components/HostLayout.jsx";
import UpdateBanner from "./components/UpdateBanner.jsx";

// Routes that live inside a portal (default host or /h/:slug). Rendered twice
// below — once for the default site, once nested under /h/:slug.
function PortalRoutes() {
	return (
		<>
			<Route index element={<Home />} />
			<Route path="matches" element={<Matches />} />
			<Route
				path="matches/:match_id"
				element={
					<ProtectedRoute>
						<IndividualMatch />
					</ProtectedRoute>
				}
			/>
			<Route path="leaderboard" element={<LeaderBoard />} />
			<Route path="seasonal-leaderboard" element={<SeasonalLeaderBoard />} />
			<Route path="eleven-aside-leaderboard" element={<ElevenLeaderBoard />} />
			<Route path="lates" element={<Lates />} />
			<Route
				path="create-match"
				element={
					<ProtectedHostAdminRoute>
						<CreateMatch />
					</ProtectedHostAdminRoute>
				}
			/>
		</>
	);
}

function App() {
	const { getAccessTokenSilently } = useAuth0();

	useEffect(() => {
		setupInterceptors(getAccessTokenSilently);
	}, [getAccessTokenSilently]);

	return (
		<div className="App">
			<Header />
			<UpdateBanner />
			<Routes>
				{/* Default portal (Farhat Football) */}
				<Route element={<HostLayout />}>{PortalRoutes()}</Route>

				{/* Host portals */}
				<Route path="/h/:slug" element={<HostLayout />}>
					{PortalRoutes()}
				</Route>

				{/* Global / shared pages (not host-scoped) */}
				<Route path="/rules" element={<Rules />} />
				<Route path="/faq" element={<FAQ />} />
				<Route path="/login" element={<LoginPage />} />
				<Route path="/players" element={<Players />} />
				<Route path="/players/:player_id" element={<PlayerDetails />} />
				<Route path="/compare" element={<PlayerComparison />} />
				<Route path="/create-account" element={<CreateAccount />} />
				<Route path="/attribute-leaderboard" element={<StatLeaderBoard />} />
				<Route
					path="/your-account"
					element={
						<ProtectedRoute>
							<AccountDetails />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/payment-dashboard"
					element={
						<ProtectedAdminRoute>
							<PaymentsDashboard />
						</ProtectedAdminRoute>
					}
				/>
				<Route
					path="/add-pitch"
					element={
						<ProtectedAdminRoute>
							<AddPitch />
						</ProtectedAdminRoute>
					}
				/>
				<Route
					path="/update-attributes"
					element={
						<ProtectedSuperAdminRoute>
							<UpdateAttributes />
						</ProtectedSuperAdminRoute>
					}
				/>
				<Route
					path="/manage-hosts"
					element={
						<ProtectedSuperAdminRoute>
							<ManageHosts />
						</ProtectedSuperAdminRoute>
					}
				/>
			</Routes>
		</div>
	);
}

export default App;
