const getPlayersInMatch =
	"SELECT p.player_id, p.first_name, p.last_name, p.preferred_name, p.year_of_birth, p.nationality, mp.goals, mp.assists, mp.late, mp.price, mp.team_id FROM match_players mp JOIN players p ON mp.player_id = p.player_id WHERE mp.match_id = $1";

module.exports = {
	getPlayersInMatch,
};
