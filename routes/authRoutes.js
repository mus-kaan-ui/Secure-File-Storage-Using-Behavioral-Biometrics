const express = require("express");

const router = express.Router();

const authController = require("../controllers/authController");

// OTP route
router.post("/verify-otp", authController.verifyOTP);

// Register route
router.post("/register", authController.registerUser);

// Login route
router.post("/login", authController.loginUser);

// Forgot password
router.post("/forgot-password", authController.forgotPassword);

// Reset password
router.post("/reset-password", authController.resetPassword);

module.exports = router;