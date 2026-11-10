import { format, parseISO } from "date-fns";

// Draft email for players already in a match that has moved pitch. Only the
// date part of match_date is used: parsing the full timestamp would shift the
// day in the browser's time zone.
export function venueChangeMessage({ match, pitch, matchUrl }) {
	const date = format(parseISO(match.match_date.substring(0, 10)), "EEEE d MMMM");
	const time = String(match.match_time).slice(0, 5);
	const venue = [pitch.pitch_name, pitch.address, pitch.postcode]
		.filter(Boolean)
		.join(", ");
	return `Venue change: the game on ${date} at ${time} has moved to ${venue}. Details: ${matchUrl}`;
}
