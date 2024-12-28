const express = require("express");
const controller = require("./controller.cjs");

const router = express.Router();

router.get("/check", controller.runCheckPaymentsScript);
router.get("/sync", controller.runSyncPaymentsScript);

module.exports = router;
