const { Router } = require("express");
const controller = require("./controller.cjs");

const router = Router();

router.get("/", controller.getAllFeedback);
router.get("/:feedback_id/replies", controller.getFeedbackReplies);
router.post("/", controller.addFeedback);
router.post("/reply", controller.addReply);
router.delete("/:feedback_id", controller.deleteFeedbackAndReplies);

module.exports = router;
