const { Router } = require("express");
const controller = require("./controller.cjs");
const checkJwt = require("../auth/checkJwt.cjs");
const requireAdmin = require("../auth/requireAdmin.cjs");

const router = Router();

// Hosts the caller can administer (portal switcher) — must be before "/:slug"
router.get("/mine", checkJwt, controller.getMyHosts);

// Superadmin host management
router.get("/", checkJwt, requireAdmin({ superadmin: true }), controller.listHosts);
router.post("/", checkJwt, requireAdmin({ superadmin: true }), controller.createHost);
router.get(
	"/:host_id/admins",
	checkJwt,
	requireAdmin({ superadmin: true }),
	controller.getHostAdmins,
);
router.post(
	"/:host_id/admins",
	checkJwt,
	requireAdmin({ superadmin: true }),
	controller.addHostAdmin,
);
router.delete(
	"/:host_id/admins/:player_id",
	checkJwt,
	requireAdmin({ superadmin: true }),
	controller.removeHostAdmin,
);

// Public: resolve slug -> host (portal context) — keep LAST
router.get("/:slug", controller.getHostBySlug);

module.exports = router;
