const { exec } = require("child_process");

// Run Check Payments Script
const runCheckPaymentsScript = (req, res) => {
	exec("node src/Apis/payments/checkPayments.cjs", (error, stdout, stderr) => {
		if (error) {
			console.error(`Error running checkPayments script: ${stderr}`);
			return res.status(500).json({ error: "Failed to check payments" });
		}
		console.log(`CheckPayments Output: ${stdout}`);
		res.json({ message: "Payments checked successfully" });
	});
};

// Run Sync Payments Script
const runSyncPaymentsScript = (req, res) => {
	exec("node src/Apis/payments/syncPayments.cjs", (error, stdout, stderr) => {
		if (error) {
			console.error(`Error running syncPayments script: ${stderr}`);
			return res.status(500).json({ error: "Failed to sync balances" });
		}
		console.log(`SyncPayments Output: ${stdout}`);
		res.json({ message: "Player balances updated successfully" });
	});
};

module.exports = { runCheckPaymentsScript, runSyncPaymentsScript };
