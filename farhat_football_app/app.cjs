// dotenv must load before any module that reads process.env at require time.
// checkJwt.cjs builds its verifier from VITE_AUTH0_AUDIENCE the moment it is
// required, and throws if that variable is unset — so this line has to stay
// above the requires below (TEST-002).
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
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

// Builds the Express app and returns it WITHOUT listening, so tests can drive
// it without opening a port. server.cjs is the only caller that listens.
const createApp = () => {
	const app = express();

	// Request logging — registered FIRST so it wraps every response, static assets
	// included (previously static serving was completely unlogged, so a bandwidth
	// spike left no trace). Counting bytes here, before compression re-wraps the
	// response, means the figure reported is the compressed on-the-wire size.
	app.use((req, res, next) => {
		const start = Date.now();
		let bytes = 0;
		const { write, end } = res;
		res.write = function (chunk, ...args) {
			if (chunk) bytes += Buffer.byteLength(chunk);
			return write.call(this, chunk, ...args);
		};
		res.end = function (chunk, ...args) {
			if (chunk) bytes += Buffer.byteLength(chunk);
			return end.call(this, chunk, ...args);
		};
		res.on("finish", () => {
			console.log(
				`${req.method} ${req.originalUrl} ${res.statusCode} ${bytes}b ${
					Date.now() - start
				}ms`,
			);
		});
		next();
	});

	// Compression: gzip every compressible response. The JS/CSS bundle and all
	// JSON shrink ~60-80% on the wire.
	app.use(compression());

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

	// ─── Monzo Webhook ──────────────────────────────────────────────────────────
	// Mounted before the SPA catch-all. The handler re-fetches every event from
	// Monzo before it can reach the ledger — see Apis/payments/monzoWebhook.cjs.
	app.post("/monzo-webhook", monzoWebhook.handleMonzoWebhook);
	// ───────────────────────────────────────────────────────────────────────────

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

	// Serve the built frontend. Vite fingerprints everything under /assets, so
	// those files can be cached indefinitely (a new build produces new filenames).
	// index.html must NEVER be cached — it points at the current hashed bundle — so
	// index:false leaves it to the catch-all below, which sets no-store.
	app.use(
		express.static(path.join(__dirname, "./dist/client"), {
			index: false,
			setHeaders: (res, filePath) => {
				if (filePath.includes(`${path.sep}assets${path.sep}`)) {
					res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
				} else {
					res.setHeader("Cache-Control", "no-cache");
				}
			},
		}),
	);

	// Ask well-behaved crawlers to leave the API alone (bandwidth hygiene).
	app.get("/robots.txt", (req, res) => {
		res.type("text/plain").send("User-agent: *\nDisallow: /api/\n");
	});

	// Catch-all route to serve frontend. Never cache index.html.
	app.get("*", (req, res) => {
		res.setHeader("Cache-Control", "no-store");
		res.sendFile(path.join(__dirname, "./dist/client", "index.html"));
	});

	// Error Handling Middleware. The unused `next` is load-bearing: Express
	// identifies an error handler by arity, and a three-parameter version stops
	// receiving errors at all.
	app.use((err, req, res, next) => {
		if (err.status === 401) {
			console.warn(`[Auth] 401 ${req.method} ${req.path}`);
			return res.status(401).json({ message: "Unauthorized" });
		}
		console.error(err.stack);
		res.status(500).send({ message: "Internal Server Error" });
	});

	return app;
};

module.exports = createApp;
