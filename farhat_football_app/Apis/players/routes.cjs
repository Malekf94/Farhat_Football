const { Router } = require("express");
const controller = require("./controller.cjs");
const checkJwt = require("../auth/checkJwt.cjs");

const router = Router();

router.use(checkJwt);

router.post("/", controller.addPlayer);
router.post("/auth0-signup", controller.auth0Signup);
router.get("/", controller.getPlayers);
router.get("/check", controller.checkEmail);
router.get("/negativeBalances", controller.getNegativeBalance);
router.get("/:player_id/stats", controller.getPlayerStats);
router.get("/:player_id/monthlystats", controller.getMonthlyPlayerStats);
router.get("/:player_id/payments", controller.getPayments);
router.get("/:player_id/balance", controller.getAccountBalance);
router.put("/:player_id/process-payments", controller.processPlayerPayments);
router.get("/:player_id", controller.getPlayer);
router.get("/owndetails/:player_id", controller.getOwnPlayer);
router.put("/:player_id", controller.updatePlayer);
router.put("/balance/:player_id", controller.updatePlayerBalance);

module.exports = router;
