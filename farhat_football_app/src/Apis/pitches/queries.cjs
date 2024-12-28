const getPitches = "SELECT * FROM pitches";
const getPitchByID = "SELECT * FROM pitches WHERE pitch_id = $1";
const addPitch = `INSERT INTO pitches (pitch_name, pitch_number, address, postcode, price)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;`;

module.exports = {
	getPitches,
	getPitchByID,
	addPitch,
};
