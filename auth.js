const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");
const verifyToken = require('../middleware/authMiddleware');

console.log("✅ auth.js loaded");


// ✅ REGISTER API
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *",
      [name, email, hashedPassword]
    );
    res.status(201).json({ msg: "User registered successfully", user: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ msg: "Email already exists" });
    }
    res.status(500).json({ msg: "Internal server error" });
  }
});

// ✅ LOGIN API
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) return res.status(401).json({ msg: "Invalid credentials" });
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ msg: "Invalid credentials" });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ msg: "Login successful", token });
  } catch (err) {
    res.status(500).json({ msg: "Internal server error" });
  }
});

// ✅ Get All Users API (PROTECTED)
router.get('/users', verifyToken, async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, email, phone, address, city, country, dob, gender FROM users');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ msg: 'Internal server error' });
  }
});

// ✅ Get Single User by ID (PROTECTED)
router.get('/users/:id', verifyToken, async (req, res) => {
  const userId = req.params.id;
  try {
    const result = await db.query(
      'SELECT id, name, email, phone, address, city, country, dob, gender FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ msg: 'User not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ msg: 'Internal server error' });
  }
});

// ✅ Update User API (PROTECTED)
router.put('/users/:id', verifyToken, async (req, res) => {
  const userId = req.params.id;
  const { name, email, password, phone, address, city, country, dob, gender } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      `UPDATE users SET 
        name = $1, email = $2, password = $3, phone = $4, address = $5, city = $6, country = $7, dob = $8, gender = $9
       WHERE id = $10 RETURNING *`,
      [name, email, hashedPassword, phone, address, city, country, dob, gender, userId]
    );
    if (result.rowCount === 0) return res.status(404).json({ msg: 'User not found' });
    const updatedUser = result.rows[0];
    delete updatedUser.password;
    res.json({ msg: 'User updated successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ msg: 'Internal server error' });
  }
});

// ✅ Delete User API (PROTECTED)
router.delete('/users/:id', verifyToken, async (req, res) => {
  const userId = req.params.id;
  try {
    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING *', [userId]);
    if (result.rowCount === 0) return res.status(404).json({ msg: 'User not found' });
    res.json({ msg: 'User deleted successfully', user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ msg: 'Internal server error' });
  }
});

// ✅ Change Password API (PROTECTED)
router.post("/change-password", verifyToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;
  try {
    const result = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Old password is incorrect" });

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE users SET password = $1 WHERE id = $2", [hashedNewPassword, userId]);
    res.json({ msg: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ msg: "Internal server error" });
  }
});
// ✅ OTP STORE (Global memory - testing only)
global.otpStore = global.otpStore || {};

// ✅ Send OTP
router.post("/forgot-password", async (req, res) => {
  const { phone } = req.body;
  try {
    const result = await db.query("SELECT * FROM users WHERE phone = $1", [phone]);
    if (result.rows.length === 0) return res.status(404).json({ msg: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000);
    global.otpStore[phone] = otp;
    console.log(`✅ OTP for ${phone}: ${otp}`);

    res.json({ msg: "OTP sent to registered phone number" });
  } catch (error) {
    res.status(500).json({ msg: "Internal server error" });
  }
});

// ✅ Reset Password
router.post("/reset-password", async (req, res) => {
  const { phone, otp, newPassword } = req.body;
  try {
    if (global.otpStore[phone] !== parseInt(otp)) return res.status(400).json({ msg: "Invalid or expired OTP" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await db.query("UPDATE users SET password = $1 WHERE phone = $2 RETURNING *", [hashedPassword, phone]);
    if (result.rowCount === 0) return res.status(404).json({ msg: "User not found" });

    delete global.otpStore[phone];
    res.json({ msg: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ msg: "Internal server error" });
  }
});


module.exports = router;
