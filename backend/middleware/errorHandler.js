const { logger, getUserContext } = require("../config/logger");

const errorHandler = (err, req, res, next) => {
  const errorData = {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  };

  // Add user context if available
  if (req.user) {
    const userContext = getUserContext(req.user);
    Object.assign(errorData, userContext);
  }

  logger.error("Request Error", errorData);

  if (process.env.NODE_ENV === "production") {
    res.status(500).json({ error: "Internal server error" });
  } else {
    res.status(500).json({
      error: err.message,
      stack: err.stack,
    });
  }
};

module.exports = errorHandler;
