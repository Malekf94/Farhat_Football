import Header from "./Pages/Header/Header.jsx";
import PersonalDetails from "./Pages/PersonalDetails/PersonalDetails.jsx";
import Matches from "./Pages/Matches/Matches.jsx";
import "./App.css";
import { Route, Routes } from "react-router-dom";
import Rules from "./Pages/Rules/Rules.jsx";
import Players from "./Pages/Players/Players.jsx";
import Home from "./Pages/Home/Home.jsx";

function App() {
	return (
		<div className="App">
			<Header />
			<Routes>
				<Route path="/Home" element={<Home />} />
				<Route path="/Rules" element={<Rules />} />
				<Route path="/Matches" element={<Matches />} />
				<Route path="/Players" element={<Players />} />
				<Route path="/PersonalDetails" element={<PersonalDetails />} />
			</Routes>
		</div>
	);
}

export default App;
