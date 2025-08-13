const express = require("express");
const dotenv = require("dotenv");
const db = require("./db");
const authRoutes = require("./routes/auth");

dotenv.config();

console.log("✅ Starting index.js");

const app = express();

console.log("✅ Middleware, Routes setup starting...");
app.use(express.json());
app.use("/api/auth", authRoutes);
console.log("✅ Routes Registered");

// ✅ DEBUGGING LOG FOR UNKNOWN ROUTE
app.use((req, res) => {
  console.error("❌ Invalid route hit:", req.method, req.url);
  res.status(404).send("Route not found");
});
// ✅ Global Catch-All Route (for debugging 404s)
app.use((req, res) => {
  console.log(`❌ Invalid route hit: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: "Route not found" });
});

app.listen(5050, () => {
  console.log("✅ Server running on port 5050");
});

