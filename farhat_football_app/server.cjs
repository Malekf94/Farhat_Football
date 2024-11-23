const express = require("express");
const matchRoutes = require("./src/Apis/matches/routes.cjs");
const playerRoutes = require("./src/Apis/players/routes.cjs");
const app = express();
const port = 3000;

app.use(express.json());

app.get("/", (req, res) => {
	res.send("Hello World!");
});

app.use(`/api/v1/matches`, matchRoutes);
app.use(`/api/v1/players`, playerRoutes);

app.listen(port, () => console.log(`app listening on ${port}`));
