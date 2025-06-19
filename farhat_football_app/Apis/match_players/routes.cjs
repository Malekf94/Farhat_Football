const { Router } = require("express");
const controller = require("./controller.cjs");

const router = Router();

router.delete("/", controller.removePlayerFromMatch);
router.post("/", controller.addPlayerToMatch);
router.get("/lates", controller.getLates);
router.get("/attributes/:match_id", controller.getPlayerAttributesInMatch);
router.put("/update-teams/:match_id", controller.updateTeamAssignments);
router.put("/:match_id/:player_id", controller.updateMatchPlayer);
router.get("/:match_id", controller.getPlayersInMatch);

module.exports = router;
