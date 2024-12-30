const { Pool } = require("pg");
require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
	connectionString: process.env.DATABASE_URL, // Use the DATABASE_URL environment variable
	ssl: isProduction
		? {
				rejectUnauthorized: false, // Required for Render's managed PostgreSQL
		  }
		: false, // No SSL for local development
});

// const pool = new Pool(
// 	isProduction
// 	  ? {
// 		  connectionString: process.env.DATABASE_URL,
// 		  ssl: {
// 			rejectUnauthorized: false,
// 		  },
// 		}
// 	  : {
// 		  host: "localhost",
// 		  port: 5432,
// 		  database: "Farhat Football",
// 		  user: "postgres",
// 		  password: process.env.SQL_PASS,
// 		}
//   );

module.exports = pool;
