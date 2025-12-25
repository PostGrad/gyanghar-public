const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { body, validationResult } = require("express-validator");
const pool = require("../config/database");
const { logger, logWithUser, getUserContext } = require("../config/logger");
const emailService = require("../config/emailService");
const router = express.Router();

const registerValidation = [
  body("firstName").trim().isLength({ min: 1, max: 50 }).escape(),
  body("lastName").trim().isLength({ min: 1, max: 50 }).escape(),
  body("email").isEmail().normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body("phone").isMobilePhone("en-IN"),
  body("whatsapp").isMobilePhone("en-IN"),
  body("roomNumber").optional().trim().isLength({ max: 10 }).escape(),
];

const loginValidation = [
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty(),
];

const forgotPasswordValidation = [body("email").isEmail().normalizeEmail()];

const resetPasswordValidation = [
  body("token").notEmpty().isLength({ min: 32, max: 255 }),
  body("password")
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
];

router.post("/register", registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Registration validation failed", {
        errors: errors.array(),
        ip: req.ip,
      });
      return res
        .status(400)
        .json({ error: "Validation failed", details: errors.array() });
    }

    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      whatsapp,
      roomNumber,
    } = req.body;

    const [existingUser] = await pool.execute(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    if (existingUser.length > 0) {
      logger.warn("Registration attempt with existing email", {
        email,
        ip: req.ip,
      });
      return res.status(400).json({ error: "Email already registered" });
    }

    const saltRounds = Number(process.env.BCRYPT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const [result] = await pool.execute(
      "INSERT INTO users (first_name, last_name, email, password_hash, phone, whatsapp, room_number) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [firstName, lastName, email, hashedPassword, phone, whatsapp, roomNumber]
    );

    logger.info("New user registered", {
      userId: result.insertId,
      userName: `${firstName} ${lastName}`,
      email,
      firstName,
      lastName,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });
    res.status(201).json({
      message: "Registration successful. Awaiting admin approval.",
      userId: result.insertId,
    });
  } catch (error) {
    logger.error("Registration error", { error: error.message, ip: req.ip });
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: errors.array() });
    }

    const { email, password } = req.body;

    const [result] = await pool.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (result.length === 0) {
      logger.warn("Login attempt with non-existent email", {
        email,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result[0];
    
    // Check if user is active (not soft deleted)
    if (!user.is_active) {
      logger.warn("Login attempt with inactive account", {
        email,
        userName: `${user.first_name} ${user.last_name}`,
        userId: user.id,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });
      return res.status(403).json({ error: "Account is inactive. Please contact admin." });
    }
    
    if (!user.is_approved) {
      logger.warn("Login attempt with unapproved account", {
        email,
        userName: `${user.first_name} ${user.last_name}`,
        userId: user.id,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });
      return res.status(403).json({ error: "Account not approved yet" });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      logger.warn("Failed login attempt", {
        email,
        userName: `${user.first_name} ${user.last_name}`,
        userId: user.id,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN, issuer: "gyan-ghar-api" }
    );

    logger.info("Successful login", {
      userId: user.id,
      userName: `${user.first_name} ${user.last_name}`,
      email,
      role: user.role,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });
    res.json({
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        isMonitor: user.is_monitor,
      },
    });
  } catch (error) {
    logger.error("Login error", { error: error.message, ip: req.ip });
    res.status(500).json({ error: "Login failed" });
  }
});

// Forgot Password Route
router.post("/forgot-password", forgotPasswordValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: errors.array() });
    }

    const { email } = req.body;

    // Check if user exists
    const [userResult] = await pool.execute(
      "SELECT id, first_name, last_name, email FROM users WHERE email = ? AND is_approved = TRUE",
      [email]
    );

    // Always return success to prevent email enumeration attacks
    if (userResult.length === 0) {
      logger.warn("Password reset requested for non-existent email", {
        email,
        ip: req.ip,
      });
      return res.json({
        message: "If this email exists, a password reset link has been sent.",
      });
    }

    const user = userResult[0];

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

    // Clean up any existing tokens for this user
    await pool.execute("DELETE FROM password_reset_tokens WHERE user_id = ?", [
      user.id,
    ]);

    // Store reset token
    await pool.execute(
      "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
      [user.id, resetToken, expiresAt]
    );

    // Send email
    try {
      await emailService.sendPasswordResetEmail(
        user.email,
        resetToken,
        `${user.first_name} ${user.last_name}`
      );

      logger.info("Password reset email sent", {
        userId: user.id,
        email: user.email,
        ip: req.ip,
      });
    } catch (emailError) {
      logger.error("Failed to send password reset email", {
        userId: user.id,
        email: user.email,
        error: emailError.message,
        ip: req.ip,
      });
      return res.status(500).json({
        error: "Failed to send reset email. Please try again later.",
      });
    }

    res.json({
      message: "If this email exists, a password reset link has been sent.",
    });
  } catch (error) {
    logger.error("Forgot password error", {
      error: error.message,
      ip: req.ip,
    });
    res.status(500).json({ error: "Password reset request failed" });
  }
});

// Reset Password Route
router.post("/reset-password", resetPasswordValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: errors.array() });
    }

    const { token, password } = req.body;

    // Find valid token
    const [tokenResult] = await pool.execute(
      `SELECT prt.user_id, prt.expires_at, u.email, u.first_name, u.last_name 
       FROM password_reset_tokens prt 
       JOIN users u ON prt.user_id = u.id 
       WHERE prt.token = ? AND prt.used = FALSE AND prt.expires_at > NOW()`,
      [token]
    );

    if (tokenResult.length === 0) {
      logger.warn("Invalid or expired reset token used", {
        token: token.substring(0, 8) + "...", // Log only first 8 chars for security
        ip: req.ip,
      });
      return res.status(400).json({
        error: "Invalid or expired reset token",
      });
    }

    const resetData = tokenResult[0];

    // Hash new password
    const saltRounds = Number(process.env.BCRYPT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update password and mark token as used (in a transaction)
    await pool.query("START TRANSACTION");

    try {
      await pool.execute("UPDATE users SET password_hash = ? WHERE id = ?", [
        hashedPassword,
        resetData.user_id,
      ]);

      await pool.execute(
        "UPDATE password_reset_tokens SET used = TRUE WHERE token = ?",
        [token]
      );

      await pool.query("COMMIT");

      // Send confirmation email (non-blocking)
      emailService
        .sendPasswordChangeConfirmation(
          resetData.email,
          `${resetData.first_name} ${resetData.last_name}`
        )
        .catch((err) => {
          logger.error("Failed to send password change confirmation", {
            userId: resetData.user_id,
            error: err.message,
          });
        });

      logger.info("Password reset successful", {
        userId: resetData.user_id,
        userName: `${resetData.first_name} ${resetData.last_name}`,
        email: resetData.email,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json({ message: "Password reset successful" });
    } catch (dbError) {
      await pool.query("ROLLBACK");
      throw dbError;
    }
  } catch (error) {
    logger.error("Reset password error", {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
    });
    console.error("Password reset detailed error:", error);
    res.status(500).json({ error: "Password reset failed" });
  }
});

// Verify Reset Token Route (optional - for frontend to check token validity)
router.get("/verify-reset-token/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const [tokenResult] = await pool.execute(
      "SELECT expires_at FROM password_reset_tokens WHERE token = ? AND used = FALSE",
      [token]
    );

    if (tokenResult.length === 0) {
      return res.status(400).json({ valid: false, error: "Invalid token" });
    }

    const { expires_at } = tokenResult[0];
    const isExpired = new Date() > new Date(expires_at);

    if (isExpired) {
      return res.status(400).json({ valid: false, error: "Token expired" });
    }

    res.json({ valid: true });
  } catch (error) {
    logger.error("Verify reset token error", {
      error: error.message,
      ip: req.ip,
    });
    res.status(500).json({ valid: false, error: "Verification failed" });
  }
});

module.exports = router;
