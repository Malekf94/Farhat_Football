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
	const { feedback_id, name, reply_content } = req.body;
	try {
		const result = await pool.query(queries.addReply, [
			feedback_id,
			name || "Anonymous",
			reply_content,
		]);
		res.status(201).json(result.rows[0]);
	} catch (error) {
		console.error("Error adding reply:", error);
		res.status(500).json({ error: "An error occurred while adding reply." });
	}
};

// Delete feedback and replies
const deleteFeedbackAndReplies = async (req, res) => {
	const { feedback_id } = req.params;

	try {
		// Use a transaction to delete feedback and associated replies
		await pool.query("BEGIN"); // Start transaction
		await pool.query(queries.deleteReplies, [feedback_id]);
		const result = await pool.query(queries.deleteFeedback, [feedback_id]);
		await pool.query("COMMIT"); // Commit transaction

		// Return success even if it was the last feedback
		if (result.rowCount > 0) {
			return res
				.status(200)
				.json({ message: "Feedback and replies deleted successfully." });
		}

		res.status(404).json({ error: "Feedback not found." });
	} catch (error) {
		await pool.query("ROLLBACK"); // Rollback transaction on error
		console.error("Error deleting feedback:", error);
		res
			.status(500)
			.json({ error: "An error occurred while deleting feedback." });
	}
};

module.exports = {
	getAllFeedback,
	getFeedbackReplies,
	addFeedback,
	addReply,
	deleteFeedbackAndReplies,
};
