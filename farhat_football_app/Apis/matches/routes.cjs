const { Router } = require("express");
const controller = require("./controller.cjs");
const checkJwt = require("../auth/checkJwt.cjs");

const router = Router();

// router.use(checkJwt);

router.get("/", controller.getMatches);
router.post("/", checkJwt, controller.createMatch);

router.get("/all/:status", controller.getMatchesByStatus);
router.post("/notify-all-players", checkJwt, controller.notifyAllPlayers);

// nested routes FIRST
router.post("/:match_id/notify-players", checkJwt, controller.notifyPlayers);

router.get("/:match_id/manOfTheMatch", controller.getManOfTheMatch);
router.put(
	"/:match_id/manOfTheMatch",
	checkJwt,
	controller.updateManOfTheMatch,
);

// base id routes LAST
router.get("/:match_id", controller.getMatchById);
router.put("/:match_id", checkJwt, controller.updateMatch);
router.delete("/:match_id", checkJwt, controller.deleteMatch);
module.exports = router;
