const pool = require("../../db.cjs");
const queries = require("./queries.cjs");

// Get all feedback
const getAllFeedback = async (req, res) => {
	try {
		const result = await pool.query(queries.getAllFeedback);
		res.status(200).json(result.rows);
	} catch (error) {
		console.error("Error fetching feedback:", error);
		res
			.status(500)
			.json({ error: "An error occurred while fetching feedback." });
	}
};

// Get replies for specific feedback
const getFeedbackReplies = async (req, res) => {
	const { feedback_id } = req.params;
	try {
		const result = await pool.query(queries.getFeedbackReplies, [feedback_id]);
		res.status(200).json(result.rows);
	} catch (error) {
		console.error("Error fetching replies:", error);
		res
			.status(500)
			.json({ error: "An error occurred while fetching replies." });
	}
};

// Add feedback
const addFeedback = async (req, res) => {
	const { name, comment, is_anonymous } = req.body;
	try {
		const result = await pool.query(queries.addFeedback, [
			name || null,
			comment,
			is_anonymous || false,
		]);
		res.status(201).json({ feedback: result.rows[0] });
	} catch (error) {
		console.error("Error adding feedback:", error);
		res.status(500).json({ error: "An error occurred while adding feedback." });
	}
};

// Add a reply to feedback
const addReply = async (req, res) => {
	const { feedback_id } = req.params; // Feedback ID from the route
	const { user_id, reply_content } = req.body; // User ID and reply content from the request body

	try {
		// Check if feedback exists
		const feedbackExists = await pool.query(
			"SELECT 1 FROM feedback WHERE feedback_id = $1",
			[feedback_id]
		);
		if (feedbackExists.rowCount === 0) {
			return res.status(404).json({ error: "Feedback not found." });
		}

		// Add the reply to the replies table
		const result = await pool.query(queries.addReply, [
			feedback_id,
			user_id,
			reply_content,
		]);

		return res
			.status(201)
			.json({ message: "Reply added successfully.", reply: result.rows[0] });
	} catch (error) {
		console.error("Error adding reply:", error);
		res
			.status(500)
			.json({ error: "An error occurred while adding the reply." });
	}
};

// Delete feedback and replies
const deleteFeedbackAndReplies = async (req, res) => {
	const { feedback_id } = req.params;

	try {
		// Start transaction
		await pool.query("BEGIN");

		// Check if feedback exists
		const feedbackExists = await pool.query(
			"SELECT 1 FROM feedback WHERE feedback_id = $1",
			[feedback_id]
		);
		if (feedbackExists.rowCount === 0) {
			await pool.query("ROLLBACK");
			return res.status(404).json({ error: "Feedback not found." });
		}

		// Delete replies
		await pool.query(queries.deleteReplies, [feedback_id]);

		// Delete feedback
		const result = await pool.query(queries.deleteFeedback, [feedback_id]);

		// Commit transaction
		await pool.query("COMMIT");

		return res.status(200).json({
			message: "Feedback and replies deleted successfully.",
			deletedFeedback: result.rows[0],
		});
	} catch (error) {
		await pool.query("ROLLBACK");
		console.error("Error deleting feedback:", error);
		res
			.status(500)
			.json({ error: "An error occurred while deleting feedback." });
	}
};

const deleteReply = async (req, res) => {
	const { feedback_id, reply_id } = req.params; // Feedback ID and Reply ID from the route
	const { user_id } = req.body; // The user ID from the request body (for permission check)

	try {
		// Check if the reply exists and belongs to the user
		const reply = await pool.query(
			"SELECT * FROM replies WHERE feedback_id = $1 AND reply_id = $2 AND user_id = $3",
			[feedback_id, reply_id, user_id]
		);

		if (reply.rowCount === 0) {
			return res.status(403).json({
				error:
					"You are not authorized to delete this reply or it doesn't exist.",
			});
		}

		// Delete the reply
		await pool.query(queries.deleteReply, [reply_id]);

		return res.status(200).json({ message: "Reply deleted successfully." });
	} catch (error) {
		console.error("Error deleting reply:", error);
		res
			.status(500)
			.json({ error: "An error occurred while deleting the reply." });
	}
};

module.exports = {
	getAllFeedback,
	getFeedbackReplies,
	addFeedback,
	addReply,
	deleteFeedbackAndReplies,
	deleteReply,
};
