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
						Check the <Link to="/faq">FAQ</Link>
						page for help
					</li>
					<li>
						Games are pay-before-you-play — you need enough balance on your
						account to join. If your balance drops too low, you won&apos;t be
						able to join until you top up
					</li>
					<li>
						If you attempt to leave the match less than 5 hours before kickoff,
						you will be automatically charged the match price
					</li>
					<li>Be early, if youre on time, then youre late</li>
					<li>If you are there after cameras are set up, late fee is £1</li>
					<li>
						Repeated lateness earns a ban: 3 lates within 3 weeks means a 1-week
						ban from joining games
					</li>
					<li>
						Goalkeeper is rotated every 7/8 minutes when the ball is out play or
						in keepers hands
					</li>
					<li>
						Keepers can&apos;t pick the ball up from a deliberate pass back
					</li>
					<li>
						Avoid wearing blades if possible, if you do wear them, be concious
						that you are wearing them and dont use full force. You may injure
						others
					</li>
					<li>
						If a game is played with a different number of players than listed on
						the website, it may not count towards the leaderboards — at the
						admin&apos;s discretion
					</li>
				</ul>
			</div>
		</section>
	);
}

export default Rules;
