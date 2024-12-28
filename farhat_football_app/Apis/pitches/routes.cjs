const { Router } = require("express");
const controller = require("./controller.cjs");

const router = Router();

router.get("/", controller.getPitches);
router.post("/", controller.addPitch);
router.get("/:pitch_id", controller.getPitchByID);

module.exports = router;
