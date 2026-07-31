const { Router } = require("express");
const controller = require("./controller.cjs");
const checkJwt = require("../auth/checkJwt.cjs");
const requireHostAdmin = require("../auth/requireHostAdmin.cjs");

const router = Router();

// The caller's own ban status for a host — before the public list route
router.get("/mine", checkJwt, controller.myBan);

// Public: who's currently banned in this portal
router.get("/", controller.listBans);

// Host admin: issue a ban (host_id in body) / lift a ban
router.post("/", checkJwt, requireHostAdmin({ source: "body" }), controller.issueBan);
router.post("/:ban_id/lift", checkJwt, controller.liftBan);

module.exports = router;
