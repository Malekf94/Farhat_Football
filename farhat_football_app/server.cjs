const express = require("express");
const matchRoutes = require("./src/Apis/matches/routes.cjs");
const playerRoutes = require("./src/Apis/players/routes.cjs");
const pitchRoutes = require("./src/Apis/pitches/routes.cjs");
const matchPlayerRoutes = require("./src/Apis/match_players/routes.cjs");
const app = express();
const port = 3000;

app.use(express.json());

app.get("/", (req, res) => {
	res.send("Hello World!");
});

app.use(`/api/v1/matches`, matchRoutes);
app.use(`/api/v1/players`, playerRoutes);
app.use(`/api/v1/pitches`, pitchRoutes);
app.use(`/api/v1/matchPlayer`, matchPlayerRoutes);

app.listen(port, () => console.log(`app listening on ${port}`));
