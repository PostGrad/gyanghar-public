const express = require("express");
const { authenticateToken, requireRole } = require("../middleware/auth");
const {
  sendWeeklyReports,
  generateWeeklyReport,
} = require("../cron/weeklyReports");
const { logger } = require("../config/logger");

const router = express.Router();

// Manual trigger for weekly reports (Admin only)
router.post(
  "/weekly/send",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      logger.info(
        `Manual weekly report trigger by admin: ${req.user.first_name} ${req.user.last_name}`
      );

      // Run the weekly report sending in background
      sendWeeklyReports().catch((error) => {
        logger.error("Error in manual weekly report sending", {
          error: error.message,
        });
      });

      res.json({
        message: "Weekly report sending initiated. Check logs for progress.",
        triggered_by: `${req.user.first_name} ${req.user.last_name}`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error triggering weekly reports", { error: error.message });
      res.status(500).json({ error: "Failed to trigger weekly reports" });
    }
  }
);

// Generate preview of weekly report for a specific student (Admin only)
router.get(
  "/weekly/preview/:studentId",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { studentId } = req.params;
      const { weekStart, weekEnd } = req.query;

      if (!weekStart || !weekEnd) {
        return res.status(400).json({
          error:
            "weekStart and weekEnd query parameters are required (YYYY-MM-DD format)",
        });
      }

      const reportData = await generateWeeklyReport(
        parseInt(studentId),
        weekStart,
        weekEnd
      );

      if (!reportData) {
        return res
          .status(404)
          .json({ error: "Student not found or no data available" });
      }

      res.json({
        student: reportData.student,
        summary: reportData.summary,
        entries_count: reportData.entries.length,
        total_days: reportData.allDates.length,
        week_period: { weekStart, weekEnd },
      });
    } catch (error) {
      logger.error("Error generating weekly report preview", {
        error: error.message,
        studentId: req.params.studentId,
      });
      res.status(500).json({ error: "Failed to generate report preview" });
    }
  }
);

// Get cron job status
router.get(
  "/cron/status",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const emailService = require("../config/emailService");

      res.json({
        message: "Weekly report cron job is active",
        schedule: "Every Monday at 6:00 PM IST",
        timezone: "Asia/Kolkata",
        next_execution: "Next Monday at 18:00",
        status: "active",
        email_service: {
          initialized: !!emailService.apiInstance,
          brevo_api_key_set: !!process.env.BREVO_API_KEY,
          brevo_sender_email_set: !!process.env.BREVO_SENDER_EMAIL,
          sender_email: process.env.BREVO_SENDER_EMAIL,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get cron status" });
    }
  }
);

// Test email service (Admin only)
router.post(
  "/email/test",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const emailService = require("../config/emailService");
      const { to, subject = "Test Email from Gyan Ghar App" } = req.body;

      if (!to) {
        return res
          .status(400)
          .json({ error: "Please provide 'to' email address" });
      }

      const testHtml = `
        <h1>Test Email</h1>
        <p>This is a test email from Gyan Ghar Accountability System.</p>
        <p>Sent by: ${req.user.first_name} ${req.user.last_name}</p>
        <p>Time: ${new Date().toLocaleString()}</p>
      `;

      const result = await emailService.sendEmail({
        to: [to],
        subject: subject,
        html: testHtml,
      });

      res.json({
        message: "Test email sent successfully",
        result: result,
        sent_by: `${req.user.first_name} ${req.user.last_name}`,
      });
    } catch (error) {
      logger.error("Test email failed", { error: error.message });
      res.status(500).json({
        error: "Failed to send test email",
        details: error.message,
      });
    }
  }
);

module.exports = router;
