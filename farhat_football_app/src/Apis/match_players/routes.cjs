const { Router } = require("express");
const controller = require("./controller.cjs");

const router = Router();

router.get("/:match_id", controller.getPlayersInMatch);

module.exports = router;
