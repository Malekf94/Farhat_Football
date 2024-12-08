const { Router } = require("express");
const controller = require("./controller.cjs");

const router = Router();

router.post("/", controller.addPlayerToMatch);
router.delete("/", controller.removePlayerFromMatch);
router.get("/:match_id", controller.getPlayersInMatch);

module.exports = router;
