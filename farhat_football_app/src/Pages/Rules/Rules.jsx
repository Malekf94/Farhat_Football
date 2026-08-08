import { Link } from "react-router-dom";
import "./Rules.css";

const ruleGroups = [
	{
		icon: "🤝",
		title: "Respect & safety",
		rules: [
			"Respect others and respect the game.",
			"Avoid wearing blades if you can. If you do, be conscious of them and don't use full force — you could injure someone.",
		],
	},
	{
		icon: "💳",
		title: "Paying to play",
		rules: [
			"Games are pay-before-you-play — you need enough balance on your account to join. If it drops too low, you can't join until you top up.",
			"Leave a match less than 5 hours before kick-off and you'll be automatically charged the match price.",
		],
	},
	{
		icon: "⏰",
		title: "Timekeeping",
		rules: [
			"Be early. If you're on time, you're late.",
			"If you arrive after the cameras are set up, there's a £1 late fee.",
			"Repeated lateness earns a ban: 3 lates within 3 weeks means a 1-week ban from joining games.",
		],
	},
	{
		icon: "⚽",
		title: "On the pitch",
		rules: [
			"Goalkeeper rotates every 7–8 minutes, when the ball is out of play or in the keeper's hands.",
			"Keepers can't pick the ball up from a deliberate pass back.",
			"If a game is played with a different number of players than listed on the website, it may not count towards the leaderboards — at the admin's discretion.",
		],
	},
];

function Rules() {
	return (
		<section className="page-content rules-page">
			<h1 className="rules-title">Our Rules</h1>
			<p className="rules-sub">Keep it fair, keep it fun — here&apos;s how we roll.</p>

			<div className="rule-groups">
				{ruleGroups.map((group) => (
					<div className="rule-group" key={group.title}>
						<h2>
							<span className="rule-icon" aria-hidden="true">
								{group.icon}
							</span>
							{group.title}
						</h2>
						<ul>
							{group.rules.map((rule, i) => (
								<li key={i}>{rule}</li>
							))}
						</ul>
					</div>
				))}
			</div>

			<p className="rules-help">
				Stuck on something? Check the <Link to="/faq">FAQ</Link>.
			</p>
		</section>
	);
}

export default Rules;
