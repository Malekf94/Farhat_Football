const { Router } = require("express");
const controller = require("./controller.cjs");
const checkJwt = require("../auth/checkJwt.cjs");
const requireAdmin = require("../auth/requireAdmin.cjs");

const router = Router();

router.get("/", controller.getPitches);
router.post("/", checkJwt, requireAdmin(), controller.addPitch);
router.get("/:pitch_id", controller.getPitchByID);

module.exports = router;
