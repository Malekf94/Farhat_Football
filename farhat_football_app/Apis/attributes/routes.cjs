const { Router } = require("express");
const controller = require("./controller.cjs");

const router = Router();

router.get("/:player_id", controller.getAttributes);
router.put("/:player_id", controller.updateAttributes);

module.exports = router;
