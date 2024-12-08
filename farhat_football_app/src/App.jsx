import Header from "./Pages/Header/Header.jsx";
import PersonalDetails from "./Pages/PersonalDetails/PersonalDetails.jsx";
import Matches from "./Pages/Matches/Matches.jsx";
import "./App.css";
import { Route, Routes } from "react-router-dom";
import Rules from "./Pages/Rules/Rules.jsx";
import Players from "./Pages/Players/Players.jsx";
import Home from "./Pages/Home/Home.jsx";
import PlayerDetails from "./Pages/PlayerDetails/PlayerDetails.jsx";
import IndividualMatch from "./Pages/IndividualMatch/IndividualMatch.jsx";
import UpcomingMatches from "./Pages/UpcomingMatches/UpcomingMatches.jsx";
import YourPage from "./Pages/YourPage/YourPage.jsx";
import CreateAccount from "./Pages/CreateAccount/CreateAccount.jsx";
import CreateMatch from "./Pages/CreateMatch/CreateMatch.jsx";

function App() {
	return (
		<div className="App">
			<Header />
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/rules" element={<Rules />} />
				<Route path="/matches/completed" element={<Matches />} />
				<Route path="/matches/pending" element={<UpcomingMatches />} />
				<Route path="/your-account" element={<YourPage />} />
				<Route path="/matches/:match_id" element={<IndividualMatch />} />
				<Route path="/players" element={<Players />} />
				<Route path="/personalDetails" element={<PersonalDetails />} />
				<Route path="/players/:player_id" element={<PlayerDetails />} />
				<Route path="/create-account" element={<CreateAccount />} />
				<Route path="/create-match" element={<CreateMatch />} />
			</Routes>
		</div>
	);
}

export default App;