const { Router } = require("express");
const controller = require("./controller.cjs");

const router = Router();

router.delete("/", controller.removePlayerFromMatch);
router.get("/:match_id", controller.getPlayersInMatch);
router.post("/", controller.addPlayerToMatch);

module.exports = router;
