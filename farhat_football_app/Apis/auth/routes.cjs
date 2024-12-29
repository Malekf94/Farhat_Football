const axios = require("axios");
const { Router } = require("express");
require("dotenv").config("../../.env");

const router = Router();

router.post("/exchange", async (req, res) => {
	const { code, code_verifier } = req.body;

	try {
		const response = await axios.post(
			`https://${process.env.AUTH0_DOMAIN}/oauth/token`,
			{
				grant_type: "authorization_code",
				client_id: process.env.AUTH0_CLIENT_ID,
				client_secret: process.env.AUTH0_CLIENT_SECRET,
				code: code,
				redirect_uri: process.env.AUTH0_REDIRECT_URI,
				code_verifier: code_verifier,
			}
		);

		const { access_token, id_token } = response.data;

		res.json({ access_token, id_token });
	} catch (error) {
		console.error("Error exchanging authorization code:", error.message);
		res.status(500).json({ error: "Failed to exchange authorization code." });
	}
});

module.exports = router;
