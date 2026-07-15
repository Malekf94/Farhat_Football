const { Router } = require("express");
const controller = require("./controller.cjs");
const checkJwt = require("../auth/checkJwt.cjs");
const requireSelfOrAdmin = require("../auth/requireSelfOrAdmin.cjs");

const router = Router();

// router.use(checkJwt);

router.post("/", controller.addPlayer);
router.post("/auth0-signup", controller.auth0Signup);

router.get("/check", checkJwt, controller.checkEmail);
router.get("/negativeBalances", controller.getNegativeBalance);

router.get("/", controller.getPlayers);

router.get(
	"/owndetails/:player_id",
	checkJwt,
	requireSelfOrAdmin,
	controller.getOwnPlayer,
);

router.get("/:player_id/stats", checkJwt, controller.getPlayerStats);
router.get(
	"/:player_id/monthlystats",
	checkJwt,
	controller.getMonthlyPlayerStats,
);
router.get(
	"/:player_id/payments",
	checkJwt,
	requireSelfOrAdmin,
	controller.getPayments,
);
router.get("/:player_id/balance", checkJwt, controller.getAccountBalance);

router.put("/:player_id", checkJwt, requireSelfOrAdmin, controller.updatePlayer);

router.get("/:player_id/matches", checkJwt, controller.getPlayerMatches);
router.get("/:player_id/career", checkJwt, controller.getCareerStats);

// 🚨 ALWAYS LAST
router.get("/:player_id", checkJwt, controller.getPlayer);
module.exports = router;
