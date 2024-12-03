const { Router } = require("express");
const controller = require("./controller.cjs");

const router = Router();

router.get("/", controller.getMatches);
router.get("/pending", controller.getPendingMatches);
router.get("/completed", controller.getCompletedMatches);
router.get("/:match_id", controller.getMatchById);
router.post("/", controller.createMatch);

module.exports = router;
