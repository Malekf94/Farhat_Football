import PropTypes from "prop-types";
import "./ConfirmModal.css";

function ConfirmModal({
	message,
	onConfirm,
	onCancel,
	confirmText = "Confirm",
	cancelText = "Cancel",
}) {
	return (
		<div className="modal-overlay">
			<div className="modal-box">
				<p>{message}</p>
				<div className="modal-actions">
					<button className="modal-btn modal-btn--confirm" onClick={onConfirm}>
						{confirmText}
					</button>
					<button className="modal-btn modal-btn--cancel" onClick={onCancel}>
						{cancelText}
					</button>
				</div>
			</div>
		</div>
	);
}

ConfirmModal.propTypes = {
	message: PropTypes.string.isRequired,
	onConfirm: PropTypes.func.isRequired,
	onCancel: PropTypes.func.isRequired,
	confirmText: PropTypes.string,
	cancelText: PropTypes.string,
};

export default ConfirmModal;
