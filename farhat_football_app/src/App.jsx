import Header from "./Pages/Header/Header.jsx";
import Matches from "./Pages/Matches/Matches.jsx";
import "./App.css";
import { Route, Routes } from "react-router-dom";
import Rules from "./Pages/Rules/Rules.jsx";
import Players from "./Pages/Players/Players.jsx";
import Home from "./Pages/Home/Home.jsx";
import PlayerDetails from "./Pages/PlayerDetails/PlayerDetails.jsx";
import IndividualMatch from "./Pages/IndividualMatch/IndividualMatch.jsx";
// import YourPage from "./Pages/YourPage/YourPage.jsx";
import CreateAccount from "./Pages/CreateAccount/CreateAccount.jsx";
import CreateMatch from "./Pages/CreateMatch/CreateMatch.jsx";
import Lates from "./Pages/Lates/Lates.jsx";
import Feedback from "./Pages/Feedback/Feedback.jsx";
import LeaderBoard from "./Pages/LeaderBoard/LeaderBoard.jsx";
import SeasonalLeaderBoard from "./Pages/SeasonalLeaderBoard/SeasonalLeaderBoard.jsx";
import LoginPage from "./Pages/LoginPage/LoginPage.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import AccountDetails from "./Pages/AccountDetails/AccountDetails.jsx";
import ProtectedAdminRoute from "./ProtectedAdminRoute.jsx";
import UpdateAttributes from "./Pages/UpdateAttributes/UpdateAttributes.jsx";
import AddPitch from "./Pages/AddPitch/AddPitch.jsx";
import HowToPay from "./Pages/HowToPay/HowToPay.jsx";
import StatLeaderBoard from "./Pages/StatLeaderBoard/StatLeaderBoard.jsx";

function App() {
	return (
		<div className="App">
			<Header />
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/rules" element={<Rules />} />
				<Route path="/how-to-pay" element={<HowToPay />} />
				<Route path="/matches" element={<Matches />} />
				<Route path="/lates" element={<Lates />} />
				<Route path="/login" element={<LoginPage />} />
				<Route
					path="/your-account"
					element={
						<ProtectedRoute>
							<AccountDetails />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/matches/:match_id"
					element={
						<ProtectedRoute>
							<IndividualMatch />
						</ProtectedRoute>
					}
				/>
				<Route path="/players" element={<Players />} />
				<Route path="/leaderBoard" element={<LeaderBoard />} />
				<Route path="/players/:player_id" element={<PlayerDetails />} />
				<Route path="/create-account" element={<CreateAccount />} />
				<Route
					path="/create-match"
					element={
						<ProtectedAdminRoute>
							<CreateMatch />
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
						<ProtectedRoute>
							<UpdateAttributes />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/feedback"
					element={
						<ProtectedRoute>
							<Feedback />
						</ProtectedRoute>
					}
				/>
				<Route path="/seasonal-leaderboard" element={<SeasonalLeaderBoard />} />
				<Route path="/attribute-leaderboard" element={<StatLeaderBoard />} />
			</Routes>
		</div>
	);
}

export default App;
