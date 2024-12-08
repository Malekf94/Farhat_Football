const getPlayersInMatch =
	"SELECT p.player_id, p.first_name, p.last_name, p.preferred_name, p.year_of_birth, p.nationality, mp.goals, mp.assists, mp.late, mp.price, mp.team_id FROM match_players mp JOIN players p ON mp.player_id = p.player_id WHERE mp.match_id = $1";

const addPlayerToMatch = `
	INSERT INTO match_players (match_id, player_id, goals, assists, late, price, team_id)
	VALUES ($1, $2, 0, 0, FALSE, $3, 1)
	RETURNING *;
  `;

const removePlayerFromMatch = `
	DELETE FROM match_players
	WHERE match_id = $1 AND player_id = $2
	RETURNING *;
  `;
module.exports = {
	getPlayersInMatch,
	addPlayerToMatch,
	removePlayerFromMatch,
};
