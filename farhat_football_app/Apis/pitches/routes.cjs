const { Router } = require("express");
const controller = require("./controller.cjs");
const checkJwt = require("../auth/checkJwt.cjs");

const router = Router();

router.use(checkJwt);

router.get("/", controller.getPitches);
router.post("/", controller.addPitch);
router.get("/:pitch_id", controller.getPitchByID);

module.exports = router;
