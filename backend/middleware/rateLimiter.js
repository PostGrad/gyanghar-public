const rateLimit = require("express-rate-limit");

const generalLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS), // 15 * 60 * 1000 = 900000, 15 minutes
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS), // limit each IP to 100 requests per windowMs
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS), // 15 * 60 * 1000 = 900000, 15 minutes
  max: Number(process.env.AUTH_RATE_LIMIT_MAX), // limit each IP to 5 login attempts per windowMs
  message: {
    error: "Too many login/registration attempts, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { generalLimiter, authLimiter };
