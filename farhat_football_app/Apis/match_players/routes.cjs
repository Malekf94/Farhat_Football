const { Router } = require("express");
const controller = require("./controller.cjs");
const checkJwt = require("../auth/checkJwt.cjs");
const requireHostAdmin = require("../auth/requireHostAdmin.cjs");

const router = Router();

// Player self-service (join / leave a match)
router.delete("/", checkJwt, controller.removePlayerFromMatch);
router.post("/", checkJwt, controller.addPlayerToMatch);

router.get("/lates", controller.getLates);
router.get("/attributes/:match_id", controller.getPlayerAttributesInMatch);

// Player-voted ratings
router.get("/ratings/:match_id/mine", checkJwt, controller.getMyRatings);
router.get(
	"/ratings/:match_id/suggested",
	checkJwt,
	requireHostAdmin(),
	controller.getSuggestedRatings,
);
router.post("/ratings/:match_id", checkJwt, controller.submitRatings);

// Host-admin only: managing teams and stats (authorised against the match's host)
router.put(
	"/update-teams/:match_id",
	checkJwt,
	requireHostAdmin(),
	controller.updateTeamAssignments,
);
router.put(
	"/batch-stats/:match_id",
	checkJwt,
	requireHostAdmin(),
	controller.batchUpdateMatchPlayers,
);
router.put(
	"/:match_id/:player_id",
	checkJwt,
	requireHostAdmin(),
	controller.updateMatchPlayer,
);
router.get("/:match_id", controller.getPlayersInMatch);

module.exports = router;
