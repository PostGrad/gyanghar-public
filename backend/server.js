const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const accountabilityRoutes = require("./routes/accountability");
const assignmentRoutes = require("./routes/assignments");
const reportRoutes = require("./routes/reports");
const profileRoutes = require("./routes/profile");
const { generalLimiter, authLimiter } = require("./middleware/rateLimiter");
const errorHandler = require("./middleware/errorHandler");
const requestLogger = require("./middleware/requestLogger");
const { logger } = require("./config/logger");
const { scheduleWeeklyReports } = require("./cron/weeklyReports");

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(generalLimiter);

// CORS configuration
const corsOptions = {
  origin:
    process.env.NODE_ENV === "production"
      ? ["https://yourdomain.com"] // Replace with your production domain
      : ["http://localhost:3000"],
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body parsing with size limits
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Trust proxy for rate limiting behind reverse proxy
app.set("trust proxy", 1);

// Request logging middleware - logs all incoming requests with IST timestamp
app.use(requestLogger);

// Routes with specific rate limiting
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/accountability", accountabilityRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/profile", profileRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Gyan Ghar API is running" });
});

// Error handling middleware (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);

  // Initialize cron jobs
  scheduleWeeklyReports();
  logger.info("Weekly report cron job initialized");
});
