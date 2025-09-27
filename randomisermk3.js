export const randomiserMk3 = (playersAttributes) => {
	let players = [...playersAttributes];
	let numberOfPlayers = players.length;

	const fair = false;

	while (fair == false) {
		// Splitting the players into two teams
		function shuffle(array) {
			for (let i = array.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1)); // random index
				[array[i], array[j]] = [array[j], array[i]]; // swap
			}
			return array;
		}

		let shuffledPlayers = shuffle(players);

		const team1 = shuffledPlayers.slice(0, numberOfPlayers / 2);
		const team2 = shuffledPlayers.slice(numberOfPlayers / 2);

		//adding total attributes
		let team1Total = team1.reduce((total, player) => {
			return (
				total +
				Object.entries(player)
					.filter(
						([key, val]) =>
							typeof val === "number" &&
							key !== "player_id" &&
							key !== "mental" &&
							key !== "goalkeeping" &&
							key !== "team_id"
					)
					.reduce((sum, [_, val]) => sum + val, 0)
			);
		}, 0);
		let team2Total = team2.reduce((total, player) => {
			return (
				total +
				Object.entries(player)
					.filter(
						([key, val]) =>
							typeof val === "number" &&
							key !== "player_id" &&
							key !== "mental" &&
							key !== "goalkeeping" &&
							key !== "team_id"
					)
					.reduce((sum, [_, val]) => sum + val, 0)
			);
		}, 0);

		// Sum a stat for a given team
		function getTeamStat(players, teamId, stat) {
			return players
				.filter((p) => p.team_id === teamId)
				.reduce((sum, p) => sum + (p[stat] || 0), 0);
		}

		let team1Mental = getTeamStat(team1, 1, "mental");
		let team2Mental = getTeamStat(team2, 2, "mental");
		let mentalDifference = Math.abs(team1Mental - team2Mental);

		let team1Goalkeeping = getTeamStat(team1, 1, "goalkeeping");
		let team2Goalkeeping = getTeamStat(team2, 2, "goalkeeping");
		let goalkeepingDifference = Math.abs(team1Goalkeeping - team2Goalkeeping);
		let totalAttributesDifference = Math.abs(team1Total - team2Total);
		console.log(
			mentalDifference,
			goalkeepingDifference,
			totalAttributesDifference
		);

		if (
			goalkeepingDifference < 15 &&
			mentalDifference < 15 &&
			totalAttributesDifference < 50
		) {
			return { team1, team2 };
		}
	}

	return { team1, team2 };
};
