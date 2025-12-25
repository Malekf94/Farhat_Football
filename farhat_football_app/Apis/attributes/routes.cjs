const { Router } = require("express");
const controller = require("./controller.cjs");

const checkJwt = require("../auth/checkJwt.cjs");

const router = Router();

// router.use(checkJwt);

router.get("/", controller.listAttributes);
router.get("/leaderboard/:attribute", controller.getLeadingAttributes);
router.get("/:player_id", controller.getAttributes);
router.put("/:player_id", controller.updateAttributes);

module.exports = router;
