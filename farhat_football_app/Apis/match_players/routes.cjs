const { Router } = require("express");
const controller = require("./controller.cjs");
const checkJwt = require("../auth/checkJwt.cjs");
const requireHostAdmin = require("../auth/requireHostAdmin.cjs");
const requireAdmin = require("../auth/requireAdmin.cjs");
const requireSelfOrHostAdmin = require("../auth/requireSelfOrHostAdmin.cjs");

const router = Router();

// Player self-service (join / leave a match). A caller may act on themselves;
// acting on another player requires admin rights over the match's host.
router.delete("/", checkJwt, requireSelfOrHostAdmin, controller.removePlayerFromMatch);
router.post("/", checkJwt, requireSelfOrHostAdmin, controller.addPlayerToMatch);

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
// Full deanonymised vote export — superadmin only
router.get(
	"/ratings/:match_id/all",
	checkJwt,
	requireAdmin({ superadmin: true }),
	controller.getMatchRatingsDetailed,
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
