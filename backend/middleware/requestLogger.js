const { logger, getBasicUserContext } = require("../config/logger");

const requestLogger = (req, res, next) => {
  // Get current timestamp in IST using Intl.DateTimeFormat
  const istFormatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const istDate = new Date();
  const istTimestamp = istFormatter.format(istDate);

  // Get client IP (considering proxy)
  const clientIP =
    req.ip ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null);

  // Log the request details
  const logMessage = {
    timestamp: istTimestamp,
    method: req.method,
    url: req.originalUrl || req.url,
    ip: clientIP,
    userAgent: req.get("User-Agent") || "Unknown",
    contentLength: req.get("Content-Length") || "0",
  };

  // Add user context if available (user is added by auth middleware)
  if (req.user) {
    const userContext = getBasicUserContext(req.user);
    logMessage.userId = userContext.userId;
    logMessage.userName = userContext.userName;
  }

  logger.info("Incoming Request", logMessage);

  // Also log to console for immediate visibility with user info
  const userInfo = req.user
    ? ` - User: ${req.user.first_name} ${req.user.last_name} (${req.user.id})`
    : "";
  console.log(
    `[${istTimestamp}] ${req.method} ${
      req.originalUrl || req.url
    } - ${clientIP}${userInfo}`
  );

  next();
};

module.exports = requestLogger;
