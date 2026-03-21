// src/auth/checkAdmin.cjs

const checkAdmin = (req, res, next) => {
	// Auth0 usually attaches the user info to req.auth or req.user
	// The 'roles' field depends on how you set up your Auth0 Rule/Action
	const roles = req.auth?.payload?.["https://your-app-url.com/roles"] || [];

	if (roles.includes("admin")) {
		next(); // User is an admin, proceed to the controller
	} else {
		res.status(403).json({ message: "Forbidden: Admin access required" });
	}
};

module.exports = checkAdmin;
