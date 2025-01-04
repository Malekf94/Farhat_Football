const getAllFeedback = `
  SELECT feedback_id, name, comment, is_anonymous, created_at
  FROM feedback
  ORDER BY created_at DESC;
`;

const getFeedbackReplies = `
  SELECT reply_id, feedback_id, name, reply_content, created_at
  FROM replies
  WHERE feedback_id = $1
  ORDER BY created_at ASC;
`;

const addFeedback = `
  INSERT INTO feedback (name, comment, is_anonymous, created_at)
  VALUES ($1, $2, $3, NOW())
  RETURNING feedback_id, name, comment, is_anonymous, created_at;
`;

const addReply = `
 INSERT INTO replies (feedback_id, user_id, reply_content, created_at)
VALUES ($1, $2, $3, NOW())
RETURNING *;
`;

const deleteFeedback = `
  DELETE FROM feedback
WHERE feedback_id = $1
RETURNING *;
`;

const deleteReplies = `
  DELETE FROM replies WHERE feedback_id = $1;
`;

const deleteReply = `
  DELETE FROM replies WHERE reply_id = $1;
`;
module.exports = {
	getAllFeedback,
	getFeedbackReplies,
	addFeedback,
	addReply,
	deleteFeedback,
	deleteReplies,
};
