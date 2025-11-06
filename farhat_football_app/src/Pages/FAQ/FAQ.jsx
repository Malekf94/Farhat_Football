import "./faq.css";

function FAQ() {
	return (
		<section className="page-content">
			<div className="rules-box">
				<h1>FAQ</h1>
				<ul>
					<li>
						<strong>What does FAQ mean?</strong>
						<br />
						Frequently Asked Questions
					</li>
					<li>
						<strong>How can I navigate this website?</strong>
						<br />
						If you're on mobile, the logo takes you to the home screen and the
						three dashes open and close the navigation menu
					</li>
					<li>
						<strong>How can I play?</strong>
						<br />
						To get started, follow these steps:
						<ul>
							<li>Create an account</li>
							<li>Go to the "Matches" tab</li>
							<li>
								Look for upcoming matches, which will be listed with the
								following details:
								<ul>
									<li>Pitch location</li>
									<li>Number of players per team</li>
									<li>Date and time of the match</li>
								</ul>
							</li>
							<li>
								All the match details will be available at the top of the page
							</li>
							<li>
								If you want to join a match:
								<ul>
									<li>
										Go to the "Your Account" page and click on "Update Balance"
									</li>
									<li>
										Alternatively, send the price of the pitch to the bank
										details provided in the group chat description, using "ffc"
										as the reference/note
									</li>
									<li>
										Note: It might take some time for your balance to update,
										but once it's done, you'll be able to join the game
									</li>
								</ul>
							</li>
						</ul>
					</li>
					<li>
						<strong>If you have further questions,</strong>
						<br />
						Please email{" "}
						<a href="mailto:farhatfootballchief@gmail.com">
							farhatfootballchief@gmail.com
						</a>{" "}
						or message me privately in the group.
					</li>
					<li>
						<strong>
							I've Joined the game but it says I'm in the reserves
						</strong>
						<br />
						Everyone goes into the reserves when they join the game, I then sort
						the teams out at least 5 hours before the game, to check whether you
						are most likely playing or not, count how many people are already in
						the game. If the number of people that joined before you are more
						than double the number of players per team, that means you're not
						playing unfortunately.
					</li>
				</ul>
			</div>
		</section>
	);
}

export default FAQ;
