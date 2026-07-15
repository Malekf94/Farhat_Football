const { Router } = require("express");
const controller = require("./controller.cjs");
const checkJwt = require("../auth/checkJwt.cjs");
const requireAdmin = require("../auth/requireAdmin.cjs");
const requireHostAdmin = require("../auth/requireHostAdmin.cjs");

const router = Router();

router.get("/", controller.getMatches);
// Create is authorised against the host_id in the body (defaults to your host)
router.post("/", checkJwt, requireHostAdmin({ source: "body" }), controller.createMatch);

router.get("/all/:status", controller.getMatchesByStatus);
// Global blast to every player — superadmin only
router.post(
	"/notify-all-players",
	checkJwt,
	requireAdmin({ superadmin: true }),
	controller.notifyAllPlayers,
);

// nested routes FIRST — authorised against the match's host
router.post(
	"/:match_id/notify-players",
	checkJwt,
	requireHostAdmin(),
	controller.notifyPlayers,
);

router.get("/:match_id/manOfTheMatch", controller.getManOfTheMatch);
router.put(
	"/:match_id/manOfTheMatch",
	checkJwt,
	requireHostAdmin(),
	controller.updateManOfTheMatch,
);

// base id routes LAST
router.get("/:match_id", controller.getMatchById);
router.put("/:match_id", checkJwt, requireHostAdmin(), controller.updateMatch);
router.delete("/:match_id", checkJwt, requireHostAdmin(), controller.deleteMatch);
module.exports = router;
