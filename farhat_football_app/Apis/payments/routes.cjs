const express = require("express");
const controller = require("./controller.cjs");

const router = express.Router();

const checkJwt = require("../auth/checkJwt.cjs");
const requireAdmin = require("../auth/requireAdmin.cjs");
const requireSelfOrHostAdmin = require("../auth/requireSelfOrHostAdmin.cjs");

router.get("/", checkJwt, requireAdmin(), controller.paymentDashboard);
router.get("/check", checkJwt, controller.runCheckPaymentsScript);
router.get("/sync", checkJwt, controller.runSyncOnly);
router.post("/refund", checkJwt, requireAdmin(), controller.issueRefund);
router.get("/audit", checkJwt, requireAdmin(), controller.balanceAudit);
router.post(
	"/reconcile/:player_id",
	checkJwt,
	requireAdmin(),
	controller.reconcilePlayer,
);
router.get("/run", checkJwt, controller.runPayments);
// Leaving a match is one command: it decides whether a charge is due, and
// removes the player from the roster, in a single transaction. The caller may
// only act on themselves unless they administer the match's host.
router.post("/leave", checkJwt, requireSelfOrHostAdmin, controller.leavingPayment);

module.exports = router;
