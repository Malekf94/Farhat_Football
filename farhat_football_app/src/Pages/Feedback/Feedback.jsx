import { useState, useEffect } from "react";
import axios from "axios";
import "./Feedback.css";
import { useAuth0 } from "@auth0/auth0-react";

function Feedback() {
	const { user } = useAuth0(); // Auth0 for user info
	const [feedback, setFeedback] = useState([]);
	const [replies, setReplies] = useState({});
	const [newFeedback, setNewFeedback] = useState({
		comment: "",
		is_anonymous: false,
	});
	const [replyContent, setReplyContent] = useState("");
	const [selectedFeedbackId, setSelectedFeedbackId] = useState(null);

	// Fetch feedback and associated replies
	const fetchFeedback = async () => {
		try {
			const response = await axios.get("/api/v1/feedback");
			setFeedback(response.data || []);
		} catch (error) {
			console.error("Error fetching feedback:", error);
			setFeedback([]);
		}
	};

	// Fetch replies for feedback
	const fetchReplies = async (feedbackId) => {
		try {
			const response = await axios.get(
				`/api/v1/feedback/${feedbackId}/replies`
			);
			setReplies((prev) => ({
				...prev,
				[feedbackId]: response.data || [],
			}));
		} catch (error) {
			console.error("Error fetching replies:", error);
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
			await axios.post("/api/v1/feedback", {
				comment: newFeedback.comment,
				is_anonymous: newFeedback.is_anonymous,
				name: newFeedback.is_anonymous ? "Anonymous" : user.preferred_name,
			});
			setNewFeedback({ comment: "", is_anonymous: false });
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
				reply_content: replyContent, // Only send reply content
				user_id: user.user_id, // Include the authenticated user's ID
			});
			setReplyContent(""); // Clear the input field
			await fetchReplies(feedbackId); // Refresh the replies for the specific feedback
			setSelectedFeedbackId(null); // Reset the selected feedback ID
		} catch (error) {
			console.error("Error submitting reply:", error);
			alert("Failed to submit reply. Please try again.");
		}
	};

	// Delete a reply
	const handleDeleteReply = async (feedbackId, replyId) => {
		try {
			await axios.delete(`/api/v1/feedback/${feedbackId}/replies/${replyId}`);
			await fetchReplies(feedbackId);
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
				<textarea
					placeholder="Enter your feedback"
					value={newFeedback.comment}
					onChange={(e) =>
						setNewFeedback({ ...newFeedback, comment: e.target.value })
					}
				></textarea>
				<label>
					<input
						type="checkbox"
						checked={newFeedback.is_anonymous}
						onChange={(e) =>
							setNewFeedback({
								...newFeedback,
								is_anonymous: e.target.checked,
							})
						}
					/>
					Post as anonymous
				</label>
				<button type="submit">Submit Feedback</button>
			</form>

			{/* Feedback List */}
			<ul className="feedback-list">
				{feedback.map((item) => (
					<li key={item.feedback_id} className="feedback-item">
						<div>
							<strong>{item.is_anonymous ? "Anonymous" : item.name}</strong>
							<p>{item.comment}</p>
							<small>{new Date(item.created_at).toLocaleString()}</small>
							{item.user_id === user.player_id && (
								<button onClick={() => handleDeleteFeedback(item.feedback_id)}>
									Delete
								</button>
							)}
						</div>

						{/* Replies */}
						<ul>
							{replies[item.feedback_id]?.map((reply) => (
								<li key={reply.reply_id}>
									<strong>{reply.name}</strong>
									<p>{reply.reply_content}</p>
									<small>{new Date(reply.created_at).toLocaleString()}</small>
									{reply.user_id === user.player_id && (
										<button
											onClick={() =>
												handleDeleteReply(item.feedback_id, reply.reply_id)
											}
										>
											Delete
										</button>
									)}
								</li>
							))}
						</ul>

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
				))}
			</ul>
		</div>
	);
}

export default Feedback;
