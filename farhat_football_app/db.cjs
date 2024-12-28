const Pool = require("pg").Pool;
require("dotenv").config();

const pool = new Pool({
	host: "localhost",
	port: 5432,
	database: "Farhat Football",
	user: "postgres",
	password: process.env.SQL_PASS,
	connectionTimeoutMillis: 30000, // Use correct property for timeout
});

module.exports = pool;
