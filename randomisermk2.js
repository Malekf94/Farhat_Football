export const randomiser = (playersAttributes) => {
	let players = [...playersAttributes];

	const team1 = [];
	const team2 = [];

	const topTwoFinishers = players
		.sort((a, b) => b.finishing + b.movement - (a.finishing + a.movement))
		.slice(0, 2);

	let restOfPlayers = players.slice(2);

	console.log(players);

	const topTwoDefenders = restOfPlayers
		.sort(
			(a, b) =>
				b.marking +
				b.positioning +
				b.tackling -
				(a.marking + a.positioning + a.tackling)
		)
		.slice(0, 2);

	restOfPlayers = restOfPlayers.slice(2);

	team1.push(topTwoFinishers[0]);
	team2.push(topTwoFinishers[1]);
	team1.push(topTwoDefenders[1]);
	team2.push(topTwoDefenders[0]);

	// Step 1: Calculate the total attribute score for each player
	restOfPlayers.forEach((player) => {
		player.totalAttributes =
			player.dribbling +
			player.finishing +
			player.first_touch +
			player.long_shots +
			player.movement +
			player.short_passing +
			player.long_passing +
			player.vision +
			player.tackling +
			player.positioning +
			player.marking +
			player.aggression +
			player.concentration +
			player.decision_making +
			player.leadership +
			player.consistency +
			player.stamina +
			player.pace +
			player.strength +
			player.workrate +
			player.teamwork;
	});

	// Step 2: Sort players by total attribute score (descending order)
	restOfPlayers.sort((a, b) => b.totalAttributes - a.totalAttributes);

	// Step 3: Distribute players between two teams as evenly as possible
	let team1Score = 0;
	let team2Score = 0;

	for (const player of restOfPlayers) {
		if (team1Score <= team2Score) {
			team1.push(player);
			team1Score += player.totalAttributes;
		} else {
			team2.push(player);
			team2Score += player.totalAttributes;
		}
	}

	return { team1, team2 };
};
