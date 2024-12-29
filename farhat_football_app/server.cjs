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
		"frame-src": ["'self'", "https://farhat-football.uk.auth0.com"], // Add frame-src
	};

	const cspHeader = Object.entries(cspDirectives)
		.map(([key, values]) => `${key} ${values.join(" ")}`)
		.join("; ");

	res.setHeader("Content-Security-Policy", cspHeader);
	next();
});

// Middleware: CORS (use environment variable for origin)
app.use(
	cors({
		origin:
			process.env.NODE_ENV === "production"
				? "https://farhat-football.com" // Your domain
				: "http://localhost:3000",
	})
);

// Middleware: Helmet for security headers
app.use(
	helmet({
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				connectSrc: [
					"'self'",
					"http://localhost:3000",
					"https://farhat-football.uk.auth0.com",
				],
				frameSrc: ["'self'", "https://farhat-football.uk.auth0.com"],
			},
		},
	})
);

// Middleware: Parse JSON
app.use(express.json());

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
app.use("/api/v1/payments", paymentRoutes);

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

// Start the server
app.listen(port, () => console.log(`App listening on port ${port}`));
