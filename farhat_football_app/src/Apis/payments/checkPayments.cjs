const axios = require("axios");
const pool = require("../../../db.cjs");
const fs = require("fs");
const prompt = require("prompt-sync")(); // Import prompt-sync for user input
require("dotenv").config({ path: "../../.env" });

// Monzo API configuration
let MONZO_ACCESS_TOKEN = process.env.MONZO_ACCESS_TOKEN; // Secure API token
const ACCOUNT_ID = process.env.MONZO_ACCOUNT_ID;

const get24HoursAgoISO = () => {
	const date = new Date();
	date.setDate(date.getDate() - 1); // Subtract 1 day
	return date.toISOString();
};

const updateEnvToken = (newToken) => {
	// Update the .env file with the new token
	const envPath = "../../.env";
	const envFile = fs.readFileSync(envPath, "utf-8");
	const updatedEnvFile = envFile.replace(
		/MONZO_ACCESS_TOKEN=.*/,
		`MONZO_ACCESS_TOKEN=${newToken}`
	);
	fs.writeFileSync(envPath, updatedEnvFile);
	console.log("New access token saved to .env file.");
};

const checkMonzoPayments = async () => {
	try {
		console.log("Fetching Monzo transactions from the last 24 hours...");

		const since = get24HoursAgoISO();

		// Fetch transactions from Monzo API
		const response = await axios.get(
			`https://api.monzo.com/transactions?account_id=${ACCOUNT_ID}&since=${since}`,
			{
				headers: { Authorization: `Bearer ${MONZO_ACCESS_TOKEN}` },
			}
		);

		const transactions = response.data.transactions;

		// Filter and process transactions
		for (const tx of transactions) {
			if (tx.notes && tx.notes.toLowerCase().includes("farhatfootball")) {
				const { id, created, amount, notes } = tx;

				// Extract player ID from the notes field (e.g., "farhatfootball_12")
				const lowerNotes = notes.toLowerCase();
				const match = lowerNotes.match(/farhatfootball(\d+)/); // Regex to get player ID
				const playerId = match ? parseInt(match[1], 10) : null;

				// Insert payment into database with the correct player ID
				await pool.query(
					`INSERT INTO payments (transaction_id, payment_date, amount, description, user_id, processed)
                     VALUES ($1, $2, $3, $4, $5, FALSE)
                     ON CONFLICT (transaction_id) DO NOTHING;`,
					[id, created, Math.abs(amount) / 100, lowerNotes, playerId]
				);

				console.log(
					`Payment processed: Transaction ID: ${id}, Player ID: ${playerId}, Amount: $${
						Math.abs(amount) / 100
					}`
				);
			}
		}

		console.log("Payments updated successfully.");
	} catch (error) {
		console.error("Error fetching payments:", error.message);

		if (error.response && error.response.status === 401) {
			// Handle token expiry
			console.log("Access token expired. Please enter a new token.");
			const newToken = prompt("Enter the new Monzo access token: ");
			if (newToken) {
				MONZO_ACCESS_TOKEN = newToken;
				updateEnvToken(newToken); // Save the token to .env
				console.log("Retrying with the new access token...");
				await checkMonzoPayments(); // Retry the function
			} else {
				console.error("No token entered. Exiting.");
			}
		}
	} finally {
		pool.end();
	}
};

checkMonzoPayments();
