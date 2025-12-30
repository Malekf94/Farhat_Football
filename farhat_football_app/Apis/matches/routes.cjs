const { Router } = require("express");
const controller = require("./controller.cjs");
const checkJwt = require("../auth/checkJwt.cjs");

const router = Router();

// router.use(checkJwt);

router.get("/", controller.getMatches);
router.post("/", controller.createMatch);

router.get("/pending", controller.getPendingMatches);
router.get("/completed", controller.getCompletedMatches);
router.get("/friendly", controller.getFriendlyMatches);
router.get("/in_progress", controller.getInProgressMatches);

// nested routes FIRST
router.post("/:match_id/notify-players", controller.notifyPlayers);

router.get("/:match_id/manOfTheMatch", controller.getManOfTheMatch);
router.put("/:match_id/manOfTheMatch", controller.updateManOfTheMatch);

// base id routes LAST
router.get("/:match_id", controller.getMatchById);
router.put("/:match_id", controller.updateMatch);
router.delete("/:match_id", controller.deleteMatch);
module.exports = router;
