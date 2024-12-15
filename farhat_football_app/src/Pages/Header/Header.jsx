import MainImage from "../../../images/Farhatfootballlogo1.jpeg";
import "./Header.css";
import { Link } from "react-router-dom";

function Header() {
	return (
		<header>
			<nav className="navbar">
				<Link to="/">
					<img className="our-logo" src={MainImage} />
				</Link>
				<div>
					<ul className="nav-links">
						<li className="header-li">
							<Link to="../rules">Rules</Link>
						</li>
						<li className="header-li">
							<Link to="../matches">Matches</Link>
						</li>
						<li className="header-li">
							<Link to="../players">Players</Link>
						</li>
						<li className="header-li">
							<Link to="../your-account">Your Account</Link>
						</li>
					</ul>
				</div>
			</nav>
		</header>
	);
}

export default Header;
