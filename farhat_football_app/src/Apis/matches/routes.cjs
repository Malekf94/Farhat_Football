const { Router } = require("express");
const controller = require("./controller.cjs");

const router = Router();

router.get("/", controller.getMatches);
router.get("/:match_id", controller.getMatchById);
router.post("/", controller.createMatch);

module.exports = router;
