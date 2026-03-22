const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const matchRoutes = require("./Apis/matches/routes.cjs");
const playerRoutes = require("./Apis/players/routes.cjs");
const pitchRoutes = require("./Apis/pitches/routes.cjs");
const matchPlayerRoutes = require("./Apis/match_players/routes.cjs");
const feedbackRoutes = require("./Apis/feedback/router.cjs");
const leaderboardRoutes = require("./Apis/leaderboard/leaderboard.cjs");
const seasonalleaderRoutes = require("./Apis/leaderboard/seasonal-leaderboard.cjs");
const attributesRoutes = require("./Apis/attributes/routes.cjs");
const paymentRoutes = require("./Apis/payments/routes.cjs");
const authRoutes = require("./Apis/auth/routes.cjs");
const { pool } = require("./db.cjs"); // 👈 make sure this points to your DB pool
const checkJwt = require("./Apis/auth/checkJwt.cjs");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware: Dynamic CSP based on environment
app.use((req, res, next) => {
	const cspDirectives = {
		"default-src": ["'self'"],
		"connect-src": [
			"'self'",
			process.env.NODE_ENV === "production"
				? "https://farhat-football.uk.auth0.com"
				: "http://localhost:3000",
		],
		"frame-src": ["'self'", "https://farhat-football.uk.auth0.com"],
	};

	const cspHeader = Object.entries(cspDirectives)
		.map(([key, values]) => `${key} ${values.join(" ")}`)
		.join("; ");

	res.setHeader("Content-Security-Policy", cspHeader);
	next();
});

// Middleware: CORS
app.use(
	cors({
		origin:
			process.env.NODE_ENV === "production"
				? "https://farhatfootball.co.uk"
				: "http://localhost:3000",
	}),
);

// Middleware: Helmet
app.use(
	helmet({
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				connectSrc: [
					"'self'",
					process.env.FRONTEND_URL,
					process.env.BACKEND_URL,
					"https://farhat-football.uk.auth0.com",
				],
				frameSrc: ["'self'", "https://farhat-football.uk.auth0.com"],
			},
		},
	}),
);

// Middleware: Parse JSON
app.use(express.json());

// ─── Monzo Webhook ────────────────────────────────────────────────────────────
app.post("/monzo-webhook", async (req, res) => {
	const data = req.body;
	try {
		if (data.type !== "transaction.created") {
			return res.sendStatus(200);
		}

		const tx = data.data;

		if (tx.amount <= 0) {
			return res.sendStatus(200);
		}

		const notes = (tx.notes || "").toLowerCase();

		if (!notes.includes("ffc")) {
			return res.sendStatus(200);
		}

		const match = notes.match(/ffc(\d+)/);
		const playerId = match ? parseInt(match[1], 10) : null;

		if (!playerId) {
			console.log("No valid player ID found in notes:", notes);
			return res.sendStatus(200);
		}

		const amount = tx.amount / 100;
		const transactionId = tx.id;
		const created = tx.created;

		await pool.query(
			`INSERT INTO payments 
				(transaction_id, payment_date, amount, description, user_id, processed)
			 VALUES ($1, $2, $3, $4, $5, FALSE)
			 ON CONFLICT (transaction_id) DO NOTHING;`,
			[transactionId, created, amount, notes, playerId],
		);

		console.log(`💰 Payment logged: Player ${playerId} - £${amount}`);
	} catch (err) {
		console.error("❌ Webhook error:", err);
	}

	res.sendStatus(200);
});
// ─────────────────────────────────────────────────────────────────────────────

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use(`/api/v1/attributes`, attributesRoutes);
app.use(`/api/v1/matches`, matchRoutes);
app.use(`/api/v1/players`, playerRoutes);
app.use(`/api/v1/pitches`, pitchRoutes);
app.use(`/api/v1/matchPlayer`, matchPlayerRoutes);
app.use("/api/v1/feedback", feedbackRoutes);
app.use("/api/v1/leaderboard", leaderboardRoutes);
app.use("/api/v1/seasonal-leaderboard", seasonalleaderRoutes);
app.use("/api/v1/payments", checkJwt, paymentRoutes);

// Serve static files from React frontend
app.use(express.static(path.join(__dirname, "./dist/client")));

// Catch-all route to serve frontend
app.get("*", (req, res) => {
	res.sendFile(path.join(__dirname, "./dist/client", "index.html"));
});

// Error Handling Middleware
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).send({ message: "Internal Server Error" });
});

app.listen(port, () => console.log(`App listening on port ${port}`));
