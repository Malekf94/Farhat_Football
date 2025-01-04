import "./Rules.css";

function Rules() {
	return (
		<section className="page-content">
			<div className="rules-box">
				<h1>Our Rules</h1>
				<ul>
					<li>Respect others and respect the game</li>
					<li>
						To update your balance, send the money to my monzo with the
						reference ffc and then your player ID, for example if your player ID
						is 25, you would type ffc25
					</li>
					<li>
						To join the next game, go to the home page and click on next game
						and click on join match. You need to be signed in for it to register
						your name
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
