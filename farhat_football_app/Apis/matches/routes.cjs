const { Router } = require("express");
const controller = require("./controller.cjs");
const checkJwt = require("../auth/checkJwt.cjs");
const requireAdmin = require("../auth/requireAdmin.cjs");

const router = Router();

// router.use(checkJwt);

router.get("/", controller.getMatches);
router.post("/", checkJwt, requireAdmin(), controller.createMatch);

router.get("/all/:status", controller.getMatchesByStatus);
router.post(
	"/notify-all-players",
	checkJwt,
	requireAdmin(),
	controller.notifyAllPlayers,
);

// nested routes FIRST
router.post(
	"/:match_id/notify-players",
	checkJwt,
	requireAdmin(),
	controller.notifyPlayers,
);

router.get("/:match_id/manOfTheMatch", controller.getManOfTheMatch);
router.put(
	"/:match_id/manOfTheMatch",
	checkJwt,
	requireAdmin(),
	controller.updateManOfTheMatch,
);

// base id routes LAST
router.get("/:match_id", controller.getMatchById);
router.put("/:match_id", checkJwt, requireAdmin(), controller.updateMatch);
router.delete(
	"/:match_id",
	checkJwt,
	requireAdmin({ superadmin: true }),
	controller.deleteMatch,
);
module.exports = router;
