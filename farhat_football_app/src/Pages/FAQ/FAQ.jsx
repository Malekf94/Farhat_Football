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
				To get started, follow these steps:
				<ul>
					<li>Create an account</li>
					<li>Go to the "Matches" tab</li>
					<li>
						Look for upcoming matches, which will be listed with the following
						details:
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
								Alternatively, send the price of the pitch to the bank details
								provided in the group chat description, using "ffc" as the
								reference/note
							</li>
							<li>
								Note: It might take some time for your balance to update, but
								once it's done, you'll be able to join the game
							</li>
						</ul>
					</li>
				</ul>
			</>
		),
	},
	{
		question: "How do I update my balance / pay?",
		answer:
			'Go to the "Your Account" page and click "Update Balance". Alternatively, send the pitch price to the bank details in the group chat using "ffc" as the reference. It may take a short while for your balance to update.',
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
					<p className="faq-no-results">No results for "{query}"</p>
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
