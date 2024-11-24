import MainImage from "../../../images/Farhatfootballlogo1.jpeg";
import "./Header.css";
import { Link } from "react-router-dom";

function Header() {
	return (
		<header>
			<nav className="navbar">
				<Link to="/Home.jsx">
					<img className="our-logo" src={MainImage} />
				</Link>
				<div>
					<ul className="nav-links">
						<li className="header-li">
							<Link to="../Rules.jsx">Rules</Link>
						</li>
						<li className="header-li">
							<Link to="../Matches.jsx">Matches</Link>
						</li>
						<li className="header-li">
							<Link to="../Players.jsx">Players</Link>
						</li>
						<li className="header-li">
							<Link to="../YourAccount.jsx">Your Account</Link>
						</li>
					</ul>
				</div>
			</nav>
		</header>
	);
}

export default Header;
