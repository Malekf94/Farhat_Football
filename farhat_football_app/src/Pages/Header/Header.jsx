import { useState } from "react";
import MainImage from "../../../images/Farhatfootballlogo1-nobg.png";
import "./Header.css";
import { Link, useLocation } from "react-router-dom";
import { useMyHosts } from "../../hooks/useMyHosts";

function Header() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const location = useLocation();
	const { myHosts } = useMyHosts();

	const toggleMenu = () => setIsMenuOpen((prev) => !prev);
	const close = () => setIsMenuOpen(false);

	// Detect the current portal from the URL (/h/:slug/...).
	const m = location.pathname.match(/^\/h\/([^/]+)/);
	const slug = m ? m[1] : null;
	const base = slug ? `/h/${slug}` : "";
	const hostPath = (p) => `${base}${p}`;

	// Portals the user can hop between (their admin hosts + the default site).
	const portals = myHosts.filter((h) => h.slug !== "farhat");

	return (
		<header>
			<nav className="navbar">
				<Link to={hostPath("/")}>
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
						<Link to="/rules" onClick={close}>
							Rules
						</Link>
					</li>
					<li className="header-li">
						<Link to="/FAQ" onClick={close}>
							FAQ
						</Link>
					</li>
					<li className="header-li">
						<Link to={hostPath("/matches")} onClick={close}>
							Matches
						</Link>
					</li>
					<li className="header-li">
						<Link to="/players" onClick={close}>
							Players
						</Link>
					</li>
					<li className="header-li">
						<Link to="/your-account" onClick={close}>
							Your Account
						</Link>
					</li>

					{/* Portal switcher — only if the user hosts other groups */}
					{portals.length > 0 && (
						<li className="header-li header-portals">
							<span className="header-portals-label">Portals ▾</span>
							<ul className="header-portals-menu">
								<li>
									<Link to="/" onClick={close}>
										Farhat Football
									</Link>
								</li>
								{portals.map((h) => (
									<li key={h.host_id}>
										<Link to={`/h/${h.slug}`} onClick={close}>
											{h.name}
										</Link>
									</li>
								))}
							</ul>
						</li>
					)}
				</ul>
			</nav>
		</header>
	);
}

export default Header;
