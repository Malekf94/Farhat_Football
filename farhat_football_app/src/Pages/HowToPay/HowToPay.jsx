import "./Rules.css";

function HowToPay() {
	return (
		<section className="page-content">
			<div className="rules-box">
				<h1>How To Pay</h1>
				<ul>
					<li>Go to your account</li>
					<li>Scroll to the bottom</li>
					<li>Click on "Show Attributes"</li>
					<li>Now you know your Player ID</li>
					<li>
						Transfer the match price to my monzo with the following reference
					</li>
					<li>ffc plus your player ID</li>
					<li>If you playerID is 42 for example, you would type ffc42</li>
					<li>
						Wait until I confirm the payment, could range from a minute to a
						couple of hours depending on my availability
					</li>
					<li>
						Once your balance has updated, you can go to the match you want to
						play and click Join Match
					</li>
				</ul>
			</div>
		</section>
	);
}

export default HowToPay;
