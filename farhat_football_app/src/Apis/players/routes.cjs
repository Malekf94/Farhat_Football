const { Router } = require("express");
const controller = require("./controller.cjs");

const router = Router();

router.post("/", controller.addPlayer);
router.get("/", controller.getPlayers);
router.get("/:player_id/stats", controller.getPlayerStats);
router.get("/:player_id", controller.getPlayer);
router.put("/:player_id", controller.updatePlayer);
router.put("/balance/:player_id", controller.updatePlayerBalance);

module.exports = router;
