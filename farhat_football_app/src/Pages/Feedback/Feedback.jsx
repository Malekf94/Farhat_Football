import { useState, useEffect } from "react";
import axios from "axios";
import "./Feedback.css";

function Feedback() {
	const [feedback, setFeedback] = useState([]);
	const [replies, setReplies] = useState([]);
	const [newFeedback, setNewFeedback] = useState({
		name: "",
		comment: "",
		is_anonymous: false,
	});
	const [replyContent, setReplyContent] = useState("");
	const [selectedFeedbackId, setSelectedFeedbackId] = useState(null);

	// Fetch all feedback
	const fetchFeedback = async () => {
		try {
			const response = await axios.get("/api/v1/feedback");
			setFeedback(response.data || []); // Ensure feedback is an array
		} catch (error) {
			console.error("Error fetching feedback:", error);
			setFeedback([]); // Default to empty array
		}
	};

	// Submit new feedback
	const handleSubmitFeedback = async (e) => {
		e.preventDefault();

		if (!newFeedback.comment.trim()) {
			alert("Comment cannot be empty!");
			return;
		}

		try {
			await axios.post("/api/v1/feedback", newFeedback);
			setNewFeedback({ name: "", comment: "", is_anonymous: false });
			await fetchFeedback();
		} catch (error) {
			console.error("Error submitting feedback:", error);
			alert("Failed to submit feedback. Please try again.");
		}
	};

	// Delete feedback
	const handleDeleteFeedback = async (feedbackId) => {
		try {
			await axios.delete(`/api/v1/feedback/${feedbackId}`);
			await fetchFeedback();
		} catch (error) {
			console.error("Error deleting feedback:", error);
			alert("Failed to delete feedback.");
		}
	};

	// Submit a reply
	const handleSubmitReply = async (feedbackId) => {
		if (!replyContent.trim()) {
			alert("Reply cannot be empty!");
			return;
		}

		try {
			await axios.post(`/api/v1/feedback/${feedbackId}/reply`, {
				reply: replyContent,
			});
			setReplyContent("");
			setSelectedFeedbackId(null);
			await fetchFeedback();
		} catch (error) {
			console.error("Error submitting reply:", error);
			alert("Failed to submit reply. Please try again.");
		}
	};

	// Delete a reply
	const handleDeleteReply = async (replyId) => {
		try {
			await axios.delete(`/api/v1/feedback/reply/${replyId}`);
			await fetchFeedback();
		} catch (error) {
			console.error("Error deleting reply:", error);
			alert("Failed to delete reply.");
		}
	};

	useEffect(() => {
		fetchFeedback();
	}, []);

	return (
		<div className="page-content feedback-page">
			<h1>Feedback & Suggestions</h1>

			{/* Feedback Form */}
			<form className="feedback-form" onSubmit={handleSubmitFeedback}>
				<div>
					<label>
						Name (optional):
						<input
							type="text"
							placeholder="Enter your name"
							value={newFeedback.name}
							onChange={(e) =>
								setNewFeedback({ ...newFeedback, name: e.target.value })
							}
							disabled={newFeedback.is_anonymous}
						/>
					</label>
					<label>
						<input
							type="checkbox"
							checked={newFeedback.is_anonymous}
							onChange={(e) =>
								setNewFeedback({
									...newFeedback,
									is_anonymous: e.target.checked,
									name: "",
								})
							}
						/>
						Post as anonymous
					</label>
				</div>
				<textarea
					placeholder="Enter your feedback"
					value={newFeedback.comment}
					onChange={(e) =>
						setNewFeedback({ ...newFeedback, comment: e.target.value })
					}
				></textarea>
				<button type="submit">Submit Feedback</button>
			</form>

			{/* Feedback List */}
			<ul className="feedback-list">
				{feedback && feedback.length > 0 ? (
					feedback.map((item) => (
						<li key={item.feedback_id} className="feedback-item">
							<div>
								<strong>{item.is_anonymous ? "Anonymous" : item.name}</strong>
								<p>{item.comment}</p>
								<small>{new Date(item.created_at).toLocaleString()}</small>
								<button onClick={() => handleDeleteFeedback(item.feedback_id)}>
									Delete
								</button>
							</div>

							{/* Replies */}
							{replies && replies.length > 0 ? (
								<ul>
									{replies.map((reply, index) => (
										<li key={index}>{reply.comment}</li>
									))}
								</ul>
							) : (
								<p>No replies yet.</p>
							)}

							{/* Reply Form */}
							{selectedFeedbackId === item.feedback_id ? (
								<div className="reply-form">
									<textarea
										placeholder="Write your reply..."
										value={replyContent}
										onChange={(e) => setReplyContent(e.target.value)}
									></textarea>
									<button onClick={() => handleSubmitReply(item.feedback_id)}>
										Submit Reply
									</button>
									<button onClick={() => setSelectedFeedbackId(null)}>
										Cancel
									</button>
								</div>
							) : (
								<button onClick={() => setSelectedFeedbackId(item.feedback_id)}>
									Reply
								</button>
							)}
						</li>
					))
				) : (
					<p>No feedback yet. Be the first to leave a comment!</p>
				)}
			</ul>
		</div>
	);
}

export default Feedback;
