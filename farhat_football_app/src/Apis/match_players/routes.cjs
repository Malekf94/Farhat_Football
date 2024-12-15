const { Router } = require("express");
const controller = require("./controller.cjs");

const router = Router();

router.delete("/", controller.removePlayerFromMatch);
router.post("/", controller.addPlayerToMatch);
router.get("/lates", controller.getLates);
router.get("/:match_id", controller.getPlayersInMatch);
router.put("/:match_id/:player_id", controller.updateMatchPlayer);

module.exports = router;
