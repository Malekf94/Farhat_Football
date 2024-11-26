const getPlayers = "SELECT * FROM players";
const checkEmailExists = "SELECT s FROM players s WHERE s.email = $1";
const addPlayer =
	"INSERT INTO players (player_name, preferred_name, email, age) VALUES ($1, $2, $3, $4)";
const getPlayer = "SELECT * FROM players where playerid = $1";

module.exports = {
	getPlayers,
	checkEmailExists,
	addPlayer,
	getPlayer,
};
