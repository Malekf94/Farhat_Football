import Header from "./Header/Header.jsx";
import PersonalDetails from "./PersonalDetails.jsx";
import Matches from "./Matches.jsx";
import "./App.css";
import { Route, Routes } from "react-router-dom";
import Rules from "./Rules/Rules.jsx";
import Player from "./Player.jsx";
import Home from "./Home/Home.jsx";

function App() {
	return (
		<div className="App">
			<Header />
			<Routes>
				<Route path="/Home.jsx" element={<Home />} />
				<Route path="/Rules.jsx" element={<Rules />} />
				<Route path="/Matches.jsx" element={<Matches />} />
				<Route path="/Player.jsx" element={<Player />} />
				<Route path="/PersonalDetails.jsx" element={<PersonalDetails />} />
			</Routes>
		</div>
	);
}

export default App;
