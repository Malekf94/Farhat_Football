const { Router } = require("express");
const controller = require("./controller.cjs");

const router = Router();

router.get("/", controller.listAttributes);
router.get("/:player_id", controller.getAttributes);
router.get("/leaderboard/:attribute", controller.getLeadingAttributes);
router.put("/:player_id", controller.updateAttributes);

module.exports = router;
