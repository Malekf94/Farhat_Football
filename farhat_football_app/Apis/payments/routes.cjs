const express = require("express");
const controller = require("./controller.cjs");

const router = express.Router();

const checkJwt = require("../auth/checkJwt.cjs");
const requireAdmin = require("../auth/requireAdmin.cjs");

router.get("/", checkJwt, controller.paymentDashboard);
router.get("/check", checkJwt, controller.runCheckPaymentsScript);
router.get("/sync", checkJwt, controller.runSyncOnly);
router.post("/refund", checkJwt, requireAdmin(), controller.issueRefund);
router.get("/run", checkJwt, controller.runPayments);
router.post("/leave/:player_id", checkJwt, controller.leavingPayment);

module.exports = router;
