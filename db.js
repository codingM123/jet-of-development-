// db.js
const { Pool } = require("pg");
const dotenv = require("dotenv");
dotenv.config();

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

db.connect()
  .then(() => console.log("✅ Connected to PostgreSQL"))
  .catch((err) => console.error("❌ PostgreSQL connection error", err));

module.exports = db;
