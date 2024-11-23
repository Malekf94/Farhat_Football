const { Router } = require("express");
const controller = require("./controller.cjs");

const router = Router();

router.get("/", controller.getMatches);
router.get("/:matchid", controller.getMatchById);
router.post("/", controller.createMatch);

module.exports = router;
