const { Router } = require("express");
const controller = require("./controller.cjs");
const checkJwt = require("../auth/checkJwt.cjs");

const router = Router();

// router.use(checkJwt);

router.post("/", controller.addPlayer);
router.post("/auth0-signup", controller.auth0Signup);
router.get("/", controller.getPlayers);
router.get("/check", controller.checkEmail);
router.get("/negativeBalances", controller.getNegativeBalance);
router.get("/:player_id/stats", checkJwt, controller.getPlayerStats);
router.get(
	"/:player_id/monthlystats",
	checkJwt,
	controller.getMonthlyPlayerStats,
);
router.get("/:player_id/payments", checkJwt, controller.getPayments);
router.get("/:player_id/balance", checkJwt, controller.getAccountBalance);
router.put(
	"/:player_id/process-payments",
	checkJwt,
	controller.processPlayerPayments,
);
router.get("/:player_id", checkJwt, controller.getPlayer);
router.get("/owndetails/:player_id", checkJwt, controller.getOwnPlayer);
router.put("/:player_id", checkJwt, controller.updatePlayer);
router.put("/balance/:player_id", checkJwt, controller.updatePlayerBalance);

module.exports = router;
