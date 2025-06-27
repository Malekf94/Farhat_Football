import { Link } from "react-router-dom";
import "./Rules.css";

function Rules() {
	return (
		<section className="page-content">
			<div className="rules-box">
				<h1>Our Rules</h1>
				<ul>
					<li>Respect others and respect the game</li>
					<li>
						Check the <Link to="/how-to-pay">How to Pay</Link>
						page for information on how to pay for games and join them
					</li>
					<li>
						To join the next game, go to the home page and click on matches,
						then one of the games under pending and click on join match.
					</li>
					<li>
						If you attempt to leave the match less than 5 hours before kickoff,
						you will be automatically charged the match price
					</li>
					<li>Be early, if youre on time, then youre late</li>
					<li>If you are there after cameras are set up, late fee is £1</li>
					<li>
						Goalkeeper is rotated every 7/8 minutes when the ball is out play or
						in keepers hands
					</li>
					<li>
						Avoid wearing blades if possible, if you do wear them, be concious
						that you are wearing them and dont go full force. You may injure
						others
					</li>
				</ul>
			</div>
		</section>
	);
}

export default Rules;
