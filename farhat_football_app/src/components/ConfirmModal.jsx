import PropTypes from "prop-types";
import { createPortal } from "react-dom";
import "./ConfirmModal.css";

function ConfirmModal({
	message,
	onConfirm,
	onCancel,
	confirmText = "Confirm",
	cancelText = "Cancel",
}) {
	// Portal to body so the fixed overlay pins to the viewport, not to
	// .page-content (whose backdrop-filter would otherwise contain it).
	return createPortal(
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
		</div>,
		document.body,
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
