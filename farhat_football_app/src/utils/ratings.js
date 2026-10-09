// Rows from GET /ratings/:match_id/suggested, keyed by the player they rate.
export function toSuggestionMap(rows) {
	const map = {};
	for (const r of rows) {
		map[r.ratee_id] = { suggested: r.suggested, votes: r.votes };
	}
	return map;
}

// Copy each player's voted average into their editable rating — the bulk form
// of the per-player "Use" button on the match page. Only players already in
// `editedStats` (i.e. in the match) are touched; suggestions for anyone else are
// ignored. Values are copied as-is (pg returns the NUMERIC average as a string);
// handleSavePlayerStats parses them on save.
export function applySuggestedRatings(editedStats, suggested) {
	const stats = { ...editedStats };
	let filled = 0;

	for (const playerId of Object.keys(stats)) {
		const suggestion = suggested[playerId];
		if (!suggestion) continue;
		stats[playerId] = { ...stats[playerId], rating: suggestion.suggested };
		filled += 1;
	}

	return { stats, filled };
}
