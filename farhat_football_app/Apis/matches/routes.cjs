const { Router } = require("express");
const controller = require("./controller.cjs");

const router = Router();

router.get("/", controller.getMatches);
router.post("/", controller.createMatch);
router.get("/pending", controller.getPendingMatches);
router.get("/completed", controller.getCompletedMatches);
router.get("/friendly", controller.getFriendlyMatches);
router.get("/in_progress", controller.getInProgressMatches);
router.get("/:match_id", controller.getMatchById);
router.put("/:match_id", controller.updateMatch);
router.get("/:match_id/manOfTheMatch", controller.getManOfTheMatch);
router.put("/:match_id/manOfTheMatch", controller.updateManOfTheMatch);

module.exports = router;
