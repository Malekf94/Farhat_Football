const express = require("express");
const controller = require("./controller.cjs");

// const router = express.Router();

const checkJwt = require("../auth/checkJwt.cjs");

const router = Router();

router.use(checkJwt);

router.get("/check", controller.runCheckPaymentsScript);
router.get("/sync", controller.runSyncPaymentsScript);

module.exports = router;
