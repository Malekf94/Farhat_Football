const pool = require("../../../db.cjs");
const queries = require("./queries.cjs");

const addPlayer = (req, res) => {
	const { player_name, preferred_name, email, age } = req.body;
	//check if email exists
	pool.query(queries.checkEmailExists, [email], (error, results) => {
		if (results.rows.length) {
			return res.status(400).send("Email already taken");
		}
		//add player to db
		pool.query(
			queries.addPlayer,
			[player_name, preferred_name, email, age],
			(error, results) => {
				if (error) throw error;
				res.status(201).send("Player added Successfully!");
			}
		);
	});
};

const getPlayers = (req, res) => {
	pool.query(queries.getPlayers, (error, results) => {
		if (error) throw error;
		res.status(200).json(results.rows);
	});
	console.log("getting players");
};

module.exports = {
	getPlayers,
	addPlayer,
};
