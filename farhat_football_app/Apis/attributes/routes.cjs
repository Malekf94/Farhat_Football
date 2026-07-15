const { Router } = require("express");
const controller = require("./controller.cjs");

const checkJwt = require("../auth/checkJwt.cjs");
const requireAdmin = require("../auth/requireAdmin.cjs");

const router = Router();

router.get("/", controller.listAttributes);
router.get("/leaderboard/:attribute", controller.getLeadingAttributes);
router.get("/:player_id", controller.getAttributes);
// Attributes are shared across all hosts, so only the superadmin may edit them
router.put(
	"/:player_id",
	checkJwt,
	requireAdmin({ superadmin: true }),
	controller.updateAttributes,
);

module.exports = router;
