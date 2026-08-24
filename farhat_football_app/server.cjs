const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const matchRoutes = require("./Apis/matches/routes.cjs");
const playerRoutes = require("./Apis/players/routes.cjs");
const pitchRoutes = require("./Apis/pitches/routes.cjs");
const matchPlayerRoutes = require("./Apis/match_players/routes.cjs");
const leaderboardRoutes = require("./Apis/leaderboard/leaderboard.cjs");
const seasonalleaderRoutes = require("./Apis/leaderboard/seasonal-leaderboard.cjs");
const elevenAsideRoutes = require("./Apis/leaderboard/eleven-aside-leaderboard.cjs");
const attributesRoutes = require("./Apis/attributes/routes.cjs");
const paymentRoutes = require("./Apis/payments/routes.cjs");
const monzoWebhook = require("./Apis/payments/monzoWebhook.cjs");
const hostRoutes = require("./Apis/hosts/routes.cjs");
const banRoutes = require("./Apis/bans/routes.cjs");
const authRoutes = require("./Apis/auth/routes.cjs");
const checkJwt = require("./Apis/auth/checkJwt.cjs");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware: CORS
app.use(
	cors({
		origin:
			process.env.NODE_ENV === "production"
				? "https://farhatfootball.co.uk"
				: process.env.FRONTEND_URL,
	}),
);

// Middleware: Helmet — the ONLY Content-Security-Policy. A hand-rolled CSP
// middleware used to run above this one and set a different, narrower policy;
// helmet then replaced the header wholesale, so that policy never reached a
// browser (SEC-014).
//
// Unset variables are filtered out: an undefined entry is serialised into the
// header as the literal token "undefined", which is not a valid source and
// silently drops the origin the directive was meant to allow.
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
				].filter(Boolean),
				frameSrc: ["'self'", "https://farhat-football.uk.auth0.com"],
			},
		},
	}),
);

// Middleware: Parse JSON
app.use(express.json());

// ─── Monzo Webhook ────────────────────────────────────────────────────────────
// Mounted before the SPA catch-all. The handler re-fetches every event from
// Monzo before it can reach the ledger — see Apis/payments/monzoWebhook.cjs.
app.post("/monzo-webhook", monzoWebhook.handleMonzoWebhook);
// ─────────────────────────────────────────────────────────────────────────────

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use(`/api/v1/attributes`, attributesRoutes);
app.use(`/api/v1/matches`, matchRoutes);
app.use(`/api/v1/players`, playerRoutes);
app.use(`/api/v1/pitches`, pitchRoutes);
app.use(`/api/v1/matchPlayer`, matchPlayerRoutes);
app.use("/api/v1/leaderboard", leaderboardRoutes);
app.use("/api/v1/seasonal-leaderboard", seasonalleaderRoutes);
app.use("/api/v1/eleven-aside-leaderboard", elevenAsideRoutes);
app.use("/api/v1/payments", checkJwt, paymentRoutes);
app.use("/api/v1/hosts", hostRoutes);
app.use("/api/v1/bans", banRoutes);

// Serve static files from React frontend
app.use(express.static(path.join(__dirname, "./dist/client")));

// Catch-all route to serve frontend
app.get("*", (req, res) => {
	res.sendFile(path.join(__dirname, "./dist/client", "index.html"));
});

// Error Handling Middleware
app.use((err, req, res, next) => {
	if (err.status === 401) {
		console.warn(`[Auth] 401 ${req.method} ${req.path}`);
		return res.status(401).json({ message: "Unauthorized" });
	}
	console.error(err.stack);
	res.status(500).send({ message: "Internal Server Error" });
});

app.listen(port, () => console.log(`App listening on port ${port}`));
