const jwt = require("jsonwebtoken");
const pool = require("../config/database");
const { logger, getBasicUserContext } = require("../config/logger");

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    logger.warn("Authentication attempt without token", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [result] = await pool.execute(
      "SELECT * FROM users WHERE id = ? AND is_approved = TRUE",
      [decoded.userId]
    );

    if (result.length === 0) {
      logger.warn("Authentication with invalid/unapproved user", {
        userId: decoded.userId,
        ip: req.ip,
      });
      return res.status(403).json({ error: "User not found or not approved" });
    }

    req.user = result[0];
    next();
  } catch (error) {
    logger.warn("Invalid token used", { error: error.message, ip: req.ip });
    return res.status(403).json({ error: "Invalid token" });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
};

module.exports = { authenticateToken, requireRole };
