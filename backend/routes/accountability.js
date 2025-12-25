const express = require("express");
const { body, validationResult } = require("express-validator");
const pool = require("../config/database");
const { authenticateToken } = require("../middleware/auth");
const { logger, logWithUser, getUserContext } = require("../config/logger");
const router = express.Router();

const accountabilityValidation = [
  body("userId").optional().isInt({ min: 1 }),
  body("entryDate").isISO8601().toDate(),
  body("wakeupTime")
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/),
  body("mangalaAarti").isBoolean(),
  body("morningKatha").isIn(["no", "youtube", "zoom"]),
  body("morningPujaTime")
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/),
  body("meditationWatchTime")
    .optional({ checkFalsy: true })
    .isInt({ min: 0, max: 60 }),
  body("vachanamrutRead").isBoolean(),
  body("mastMeditation").isBoolean(),
  body("cheshta").isBoolean(),
  body("mansiPujaCount").isInt({ min: 0, max: 5 }),
  body("readingTime")
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/),
  body("wastedTime")
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/),
  body("mantraJap").optional().isInt({ min: 0 }),
  body("notes").optional().trim().isLength({ max: 500 }).escape(),
];

router.post(
  "/create",
  authenticateToken,
  accountabilityValidation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ error: "Validation failed", details: errors.array() });
      }

      const data = req.body;
      const targetUserId = data.userId || req.user.id;

      // Get target user information for logging
      let targetUser = req.user;
      if (targetUserId !== req.user.id) {
        const [targetUserResult] = await pool.execute(
          "SELECT first_name, last_name, email FROM users WHERE id = ?",
          [targetUserId]
        );
        if (targetUserResult.length > 0) {
          targetUser = targetUserResult[0];
        }
      }

      // Check if user can fill data for target user
      if (targetUserId !== req.user.id) {
        const [canFill] = await pool.execute(
          "SELECT 1 FROM monitor_assignments WHERE monitor_student_id = ? AND assigned_student_id = ?",
          [req.user.id, targetUserId]
        );
        if (
          canFill.length === 0 &&
          req.user.role !== "admin" &&
          req.user.role !== "poshak_leader"
        ) {
          logger.warn("Unauthorized accountability entry attempt", {
            userId: req.user.id,
            userName: `${req.user.first_name} ${req.user.last_name}`,
            targetUserId,
            targetUserName: `${targetUser.first_name} ${targetUser.last_name}`,
            ip: req.ip,
            userAgent: req.get("User-Agent"),
          });
          return res
            .status(403)
            .json({ error: "Not authorized to fill data for this user" });
        }
      }

      const [result] = await pool.execute(
        `INSERT INTO accountability_entries 
       (user_id, entry_date, wakeup_time, mangala_aarti, morning_katha, morning_puja_time, meditation_watch_time,
        vachanamrut_read, mast_meditation, cheshta, mansi_puja_count, reading_time, wasted_time, mantra_jap, notes, filled_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         wakeup_time = VALUES(wakeup_time),
         mangala_aarti = VALUES(mangala_aarti),
         morning_katha = VALUES(morning_katha),
         morning_puja_time = VALUES(morning_puja_time),
         meditation_watch_time = VALUES(meditation_watch_time),
         vachanamrut_read = VALUES(vachanamrut_read),
         mast_meditation = VALUES(mast_meditation),
         cheshta = VALUES(cheshta),
         mansi_puja_count = VALUES(mansi_puja_count),
         reading_time = VALUES(reading_time),
         wasted_time = VALUES(wasted_time),
         mantra_jap = VALUES(mantra_jap),
         notes = VALUES(notes),
         filled_by_user_id = VALUES(filled_by_user_id),
         updated_at = CURRENT_TIMESTAMP`,
        [
          targetUserId,
          data.entryDate,
          data.wakeupTime,
          data.mangalaAarti,
          data.morningKatha,
          data.morningPujaTime,
          data.meditationWatchTime,
          data.vachanamrutRead,
          data.mastMeditation,
          data.cheshta,
          data.mansiPujaCount,
          data.readingTime,
          data.wastedTime,
          data.mantraJap,
          data.notes,
          req.user.id,
        ]
      );

      logger.info("Accountability entry saved", {
        userId: req.user.id,
        userName: `${req.user.first_name} ${req.user.last_name}`,
        targetUserId,
        targetUserName: `${targetUser.first_name} ${targetUser.last_name}`,
        entryId: result.insertId,
        entryDate: data.entryDate,
        ip: req.ip,
      });
      res.json({ message: "Accountability entry saved", id: result.insertId });
    } catch (error) {
      logger.error("Failed to save accountability entry", {
        error: error.message,
        userId: req.user.id,
        userName: `${req.user.first_name} ${req.user.last_name}`,
        targetUserId,
        ip: req.ip,
      });
      res.status(500).json({ error: "Failed to save entry" });
    }
  }
);

router.get("/list", authenticateToken, async (req, res) => {
  try {
    const { date, userId } = req.query;
    let query = `
      SELECT ae.id, ae.user_id, DATE_FORMAT(ae.entry_date, '%Y-%m-%d') as entry_date, ae.wakeup_time, ae.mangala_aarti, ae.morning_katha, ae.morning_puja_time, ae.meditation_watch_time,
             ae.vachanamrut_read, ae.mast_meditation, ae.cheshta, ae.mansi_puja_count, ae.reading_time, ae.wasted_time,
             ae.mantra_jap, ae.notes, ae.filled_by_user_id, ae.created_at, ae.updated_at,
             u.first_name, u.last_name, u.room_number,
             p.first_name as poshak_first_name, p.last_name as poshak_last_name
      FROM accountability_entries ae
      JOIN users u ON ae.user_id = u.id
      LEFT JOIN poshak_assignments pa ON u.id = pa.assigned_student_id
      LEFT JOIN users p ON pa.poshak_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      query += ` AND ae.entry_date = ?`;
      params.push(date);
    }

    if (userId) {
      query += ` AND ae.user_id = ?`;
      params.push(userId);
    }

    query += " ORDER BY ae.entry_date DESC, u.first_name";
    const [result] = await pool.execute(query, params);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch entries" });
  }
});

router.get("/user-settings", authenticateToken, async (req, res) => {
  try {
    const [result] = await pool.execute(
      "SELECT user_settings FROM users WHERE id = ?",
      [req.user.id]
    );
    res.json(result[0]?.user_settings || {});
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user settings" });
  }
});

router.put("/user-settings", authenticateToken, async (req, res) => {
  try {
    const { settings } = req.body;
    await pool.execute("UPDATE users SET user_settings = ? WHERE id = ?", [
      JSON.stringify(settings),
      req.user.id,
    ]);
    res.json({ message: "Settings updated" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// Get accountability report for date range with pagination
router.get("/report", authenticateToken, async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      userId,
      page = 1,
      limit = 15,
      sortBy = "entry_date",
      sortOrder = "DESC",
    } = req.query;

    // Parse numeric values early to avoid type mismatches
    const parsedPage = parseInt(page) || 1;
    const parsedLimit = parseInt(limit) || 15;
    const offset = (parsedPage - 1) * parsedLimit;

    // Base query for getting entries
    let query = `
      SELECT ae.id, ae.user_id, DATE_FORMAT(ae.entry_date, '%Y-%m-%d') as entry_date, ae.wakeup_time, ae.mangala_aarti, ae.morning_katha, ae.morning_puja_time, ae.meditation_watch_time,
             ae.vachanamrut_read, ae.mast_meditation, ae.cheshta, ae.mansi_puja_count, ae.reading_time, ae.wasted_time,
             ae.mantra_jap, ae.notes, ae.filled_by_user_id, ae.created_at, ae.updated_at,
             u.first_name, u.last_name, u.room_number,
             p.first_name as poshak_first_name, p.last_name as poshak_last_name
      FROM accountability_entries ae
      JOIN users u ON ae.user_id = u.id
      LEFT JOIN poshak_assignments pa ON u.id = pa.assigned_student_id
      LEFT JOIN users p ON pa.poshak_id = p.id
      WHERE 1=1
    `;

    // Count query for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM accountability_entries ae
      JOIN users u ON ae.user_id = u.id
      WHERE 1=1
    `;

    const params = [];
    const countParams = [];

    // Add date range filters
    if (fromDate) {
      query += ` AND ae.entry_date >= ?`;
      countQuery += ` AND ae.entry_date >= ?`;
      params.push(fromDate);
      countParams.push(fromDate);
    }

    if (toDate) {
      query += ` AND ae.entry_date <= ?`;
      countQuery += ` AND ae.entry_date <= ?`;
      params.push(toDate);
      countParams.push(toDate);
    }

    // Add user filter
    if (userId) {
      query += ` AND ae.user_id = ?`;
      countQuery += ` AND ae.user_id = ?`;
      params.push(parseInt(userId));
      countParams.push(parseInt(userId));
    }

    // Add sorting and pagination
    const validSortColumns = [
      "entry_date",
      "first_name",
      "wakeup_time",
      "morning_puja_time",
      "reading_time",
      "wasted_time",
    ];
    const sortColumn = validSortColumns.includes(sortBy)
      ? sortBy
      : "entry_date";
    const order = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

    query += ` ORDER BY ${sortColumn} ${order}, u.first_name ASC`;
    query += ` LIMIT ${parsedLimit} OFFSET ${offset}`;

    // Execute both queries
    const [entries] = await pool.execute(query, params);
    const [countResult] = await pool.execute(countQuery, countParams);

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / parsedLimit);

    res.json({
      entries,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages,
        hasNext: parsedPage < totalPages,
        hasPrev: parsedPage > 1,
      },
    });
  } catch (error) {
    console.error("Failed to fetch accountability report:", error);
    res.status(500).json({ error: "Failed to fetch accountability report" });
  }
});

module.exports = router;
