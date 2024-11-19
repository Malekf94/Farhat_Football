import PropTypes from "prop-types";

function Player(props) {
	return (
		<div>
			<p>Name: {props}</p>
		</div>
	);
}
Player.PropTypes = {
	name: PropTypes.string,
};
Player.defaultProps = {
	name: "Guest",
};
export default Player;
