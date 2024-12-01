const { Router } = require("express");
const controller = require("./controller.cjs");

const router = Router();

router.post("/", controller.addPlayer);
router.get("/", controller.getPlayers);
router.get("/:player_id", controller.getPlayer);

module.exports = router;
