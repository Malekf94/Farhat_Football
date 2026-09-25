const { Router } = require("express");
const controller = require("./controller.cjs");

const checkJwt = require("../auth/checkJwt.cjs");
const requireAdmin = require("../auth/requireAdmin.cjs");

const router = Router();

router.get("/", controller.listAttributes);
router.get("/leaderboard/:attribute", controller.getLeadingAttributes);
// Superadmin CSV export of the attributes of every player in a given match.
// Must stay above the parameterised "/:player_id" route below.
router.get(
	"/export/:match_id",
	checkJwt,
	requireAdmin({ superadmin: true }),
	controller.exportPlayerAttributes,
);
router.get("/:player_id", controller.getAttributes);
// Attributes are shared across all hosts, so only the superadmin may edit them
router.put(
	"/:player_id",
	checkJwt,
	requireAdmin({ superadmin: true }),
	controller.updateAttributes,
);

module.exports = router;
