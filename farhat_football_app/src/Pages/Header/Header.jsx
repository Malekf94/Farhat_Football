import { useState } from "react";
import MainImage from "../../../images/Farhatfootballlogo1.jpeg";
import "./Header.css";
import { Link } from "react-router-dom";

function Header() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	const toggleMenu = () => {
		setIsMenuOpen((prev) => !prev);
	};

	return (
		<header>
			<nav className="navbar">
				<Link to="/">
					<img
						className="our-logo"
						src={MainImage}
						alt="Farhat Football Logo"
					/>
				</Link>
				<button className="menu-toggle" onClick={toggleMenu}>
					☰
				</button>
				<ul className={`nav-links ${isMenuOpen ? "open" : ""}`}>
					<li className="header-li">
						<Link to="/rules" onClick={() => setIsMenuOpen(false)}>
							Rules
						</Link>
					</li>
					<li className="header-li">
						<Link to="/how-to-pay" onClick={() => setIsMenuOpen(false)}>
							How To Pay
						</Link>
					</li>
					<li className="header-li">
						<Link to="/matches" onClick={() => setIsMenuOpen(false)}>
							Matches
						</Link>
					</li>
					<li className="header-li">
						<Link to="/players" onClick={() => setIsMenuOpen(false)}>
							Players
						</Link>
					</li>
					<li className="header-li">
						<Link to="/your-account" onClick={() => setIsMenuOpen(false)}>
							Your Account
						</Link>
					</li>
				</ul>
			</nav>
		</header>
	);
}

export default Header;
