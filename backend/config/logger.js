const winston = require("winston");

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "gyan-ghar-api" },
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

// Helper function to get user context for logging
const getUserContext = (user) => {
  if (!user) return {};

  return {
    userId: user.id,
    userName: `${user.first_name} ${user.last_name}`.trim(),
    email: user.email,
    role: user.role,
  };
};

// Helper function to get basic user context (just ID and name)
const getBasicUserContext = (user) => {
  if (!user) return {};

  return {
    userId: user.id,
    userName: `${user.first_name} ${user.last_name}`.trim(),
  };
};

// Enhanced logging methods that include user context
const logWithUser = {
  info: (message, data = {}, user = null) => {
    const userContext = getUserContext(user);
    logger.info(message, { ...data, ...userContext });
  },

  warn: (message, data = {}, user = null) => {
    const userContext = getUserContext(user);
    logger.warn(message, { ...data, ...userContext });
  },

  error: (message, data = {}, user = null) => {
    const userContext = getUserContext(user);
    logger.error(message, { ...data, ...userContext });
  },

  debug: (message, data = {}, user = null) => {
    const userContext = getUserContext(user);
    logger.debug(message, { ...data, ...userContext });
  },
};

module.exports = {
  logger,
  logWithUser,
  getUserContext,
  getBasicUserContext,
};
