import "./faq.css";
import { useState } from "react";

const faqs = [
	{
		question: "What does FAQ mean?",
		answer: "Frequently Asked Questions",
		tags: ["faq", "general"],
	},
	{
		question: "How can I navigate this website?",
		answer:
			"If you're on mobile, the logo takes you to the home screen and the three dashes open and close the navigation menu.",
		tags: ["navigation", "mobile", "website"],
	},
	{
		question: "How can I play?",
		answer: null,
		tags: [
			"play",
			"join",
			"match",
			"game",
			"account",
			"balance",
			"payment",
			"pay",
			"pitch",
		],
		custom: (
			<>
				It&apos;s dead simple:
				<ul>
					<li>
						<strong>Sign up</strong> — just your name and year of birth.
					</li>
					<li>
						<strong>Add credit</strong> — go to <em>Your Account</em> and hit{" "}
						<em>Top Up Balance</em>. We&apos;re pay-before-you-play, so you need
						money on your account before joining (games are usually around
						£4.50). It tags the payment to you automatically.
					</li>
					<li>
						<strong>Pick a game</strong> in the <em>Matches</em> tab — you&apos;ll
						see the pitch, players per team, and the date and time.
					</li>
					<li>
						<strong>Hit Join</strong> — as long as you&apos;ve got the balance,
						you&apos;re in.
					</li>
					<li>
						<strong>Turn up and play.</strong> The fee comes off your balance
						once the game is marked complete.
					</li>
				</ul>
				Heads up: if you drop out within 5 hours of kick-off you&apos;ll still be
				charged, and being late 3 times in 3 weeks means a 1-week ban — so try
				to be on time!
			</>
		),
	},
	{
		question: "How do I update my balance / pay?",
		answer:
			'Go to the "Your Account" page and click "Top Up Balance" — it opens a payment link that tags the money to you automatically. It may take a short while for your balance to update.',
		tags: ["balance", "payment", "pay", "money", "account", "update", "bank"],
	},
	{
		question: "I've joined the game but it says I'm in the reserves",
		answer:
			"Everyone goes into the reserves when they join the game. Teams are sorted at least 5 hours before the game. To check whether you're likely playing, count how many people joined before you — if that number is more than double the players per team, you're unfortunately not playing.",
		tags: ["reserves", "team", "join", "playing", "game", "match"],
	},
	{
		question: "How do I contact you if I have further questions?",
		answer: null,
		tags: ["contact", "email", "question", "help", "support"],
		custom: (
			<>
				Please email{" "}
				<a href="mailto:farhatfootballchief@gmail.com">
					farhatfootballchief@gmail.com
				</a>{" "}
				or message privately in the group.
			</>
		),
	},
];

function highlight(text, query) {
	if (!query) return text;
	const parts = text.split(new RegExp(`(${query})`, "gi"));
	return parts.map((part, i) =>
		part.toLowerCase() === query.toLowerCase() ? (
			<mark key={i}>{part}</mark>
		) : (
			part
		),
	);
}

function FAQ() {
	const [query, setQuery] = useState("");

	const filtered = query.trim()
		? faqs.filter((faq) => {
				const q = query.toLowerCase();
				return (
					faq.question.toLowerCase().includes(q) ||
					(faq.answer && faq.answer.toLowerCase().includes(q)) ||
					faq.tags.some((tag) => tag.includes(q))
				);
			})
		: faqs;

	return (
		<section className="page-content">
			<div className="rules-box">
				<h1>FAQ</h1>

				<div className="faq-search-container">
					<input
						type="text"
						className="faq-search-input"
						placeholder="Search questions... e.g. pay, join, balance"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
					{query && (
						<button className="faq-search-clear" onClick={() => setQuery("")}>
							✕
						</button>
					)}
				</div>

				{filtered.length === 0 && (
					<p className="faq-no-results">No results for &quot;{query}&quot;</p>
				)}

				<ul className="faq-list">
					{filtered.map((faq, i) => (
						<li key={i} className="faq-item">
							<strong>{highlight(faq.question, query)}</strong>
							<div className="faq-answer">
								{faq.custom ? faq.custom : highlight(faq.answer, query)}
							</div>
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}

export default FAQ;
