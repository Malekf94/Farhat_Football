const { Router } = require("express");
const controller = require("./controller.cjs");

const router = Router();

router.get("/", controller.getAllFeedback);
router.get("/:feedback_id/replies", controller.getFeedbackReplies);
router.post("/", controller.addFeedback);
router.delete("/:feedback_id", controller.deleteFeedbackAndReplies);
router.post("/:feedback_id/reply", controller.addReply);
router.delete("/:feedback_id/replies/:reply_id", controller.deleteReply);

module.exports = router;
