const { Router } = require("express");
const controller = require("./controller.cjs");
const checkJwt = require("../auth/checkJwt.cjs");
const requireAdmin = require("../auth/requireAdmin.cjs");

const router = Router();

// Player self-service (join / leave a match)
router.delete("/", checkJwt, controller.removePlayerFromMatch);
router.post("/", checkJwt, controller.addPlayerToMatch);

router.get("/lates", controller.getLates);
router.get("/attributes/:match_id", controller.getPlayerAttributesInMatch);

// Admin-only: managing teams and stats
router.put(
	"/update-teams/:match_id",
	checkJwt,
	requireAdmin(),
	controller.updateTeamAssignments,
);
router.put(
	"/batch-stats/:match_id",
	checkJwt,
	requireAdmin(),
	controller.batchUpdateMatchPlayers,
);
router.put(
	"/:match_id/:player_id",
	checkJwt,
	requireAdmin(),
	controller.updateMatchPlayer,
);
router.get("/:match_id", controller.getPlayersInMatch);

module.exports = router;
