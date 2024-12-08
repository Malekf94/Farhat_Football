const { Router } = require("express");
const controller = require("./controller.cjs");

const router = Router();

router.get("/", controller.getMatches);
router.post("/", controller.createMatch);
router.get("/pending", controller.getPendingMatches);
router.get("/completed", controller.getCompletedMatches);
router.get("/:match_id", controller.getMatchById);

module.exports = router;
