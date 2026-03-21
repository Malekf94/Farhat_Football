const { Router } = require("express");
const controller = require("./controller.cjs");
const checkJwt = require("../auth/checkJwt.cjs");

const router = Router();

// router.use(checkJwt);

router.delete("/", checkJwt, controller.removePlayerFromMatch);
router.post("/", checkJwt, controller.addPlayerToMatch);
router.get("/lates", controller.getLates);
router.get("/attributes/:match_id", controller.getPlayerAttributesInMatch);
router.put(
	"/update-teams/:match_id",
	checkJwt,
	controller.updateTeamAssignments,
);
router.put("/:match_id/:player_id", checkJwt, controller.updateMatchPlayer);
router.get("/:match_id", controller.getPlayersInMatch);

module.exports = router;
