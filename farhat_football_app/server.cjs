const express = require("express");
const matchRoutes = require("./Apis/matches/routes.cjs");
const playerRoutes = require("./Apis/players/routes.cjs");
const pitchRoutes = require("./Apis/pitches/routes.cjs");
const matchPlayerRoutes = require("./Apis/match_players/routes.cjs");
const feedbackRoutes = require("./Apis/feedback/router.cjs");
const leaderboardRoutes = require("./Apis/leaderboard/leaderboard.cjs");
const seasonalleaderRoutes = require("./Apis/leaderboard/seasonal-leaderboard.cjs");
const attributesRoutes = require("./Apis/attributes/routes.cjs");
const paymentRoutes = require("./Apis/payments/routes.cjs");
const app = express();
const port = 3000;

app.use(express.json());

app.get("/", (req, res) => {
	res.send("Hello World!");
});

app.use(`/api/v1/attributes`, attributesRoutes);
app.use(`/api/v1/matches`, matchRoutes);
app.use(`/api/v1/players`, playerRoutes);
app.use(`/api/v1/pitches`, pitchRoutes);
app.use(`/api/v1/matchPlayer`, matchPlayerRoutes);
app.use("/api/v1/feedback", feedbackRoutes);
app.use("/api/v1/leaderboard", leaderboardRoutes);
app.use("/api/v1/seasonal-leaderboard", seasonalleaderRoutes);
app.use("/api/v1/payments", paymentRoutes);

app.listen(port, () => console.log(`app listening on ${port}`));
