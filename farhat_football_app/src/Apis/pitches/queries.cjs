const getPitches = "SELECT * FROM pitches";
const getPitchByID = "SELECT * FROM pitches WHERE pitch_id = $1";

module.exports = {
	getPitches,
	getPitchByID,
};
