import Header from "./Pages/Header/Header.jsx";
import PersonalDetails from "./Pages/PersonalDetails.jsx";
import Matches from "./Pages/Matches.jsx";
import "./App.css";
import { Route, Routes } from "react-router-dom";
import Rules from "./Pages/Rules/Rules.jsx";
import Player from "./Pages/Player.jsx";
import Home from "./Pages/Home/Home.jsx";

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
