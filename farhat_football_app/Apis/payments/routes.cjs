const express = require("express");
const controller = require("./controller.cjs");

const router = express.Router();

const checkJwt = require("../auth/checkJwt.cjs");

// const router = Router();

// router.use(checkJwt);

router.get("/", checkJwt, controller.paymentDashboard);
router.get("/check", checkJwt, controller.runCheckPaymentsScript);
router.get("/sync", checkJwt, controller.runSyncPaymentsScript);
router.get("/run", checkJwt, controller.runPayments);

module.exports = router;
