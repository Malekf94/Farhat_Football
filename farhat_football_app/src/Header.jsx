import MainImage from "../images/Farhatfootballlogo1.jpeg";

function Header() {
	return (
		<header>
			<h1>Farhat Football</h1>
			<nav>
				<a href="index.html">
					<img className="our-logo" src={MainImage} />
				</a>
				<div>
					<ul>
						<li>
							<a href="./rules.html">Rules</a>
						</li>
						<li>
							<a href="">Matches</a>
						</li>
						<li>
							<a href="">Players</a>
						</li>
						<li>
							<a href="">Your Account</a>
						</li>
					</ul>
				</div>
			</nav>
		</header>
	);
}

export default Header;
