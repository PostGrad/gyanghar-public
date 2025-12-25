const express = require("express");
const { body, param, validationResult } = require("express-validator");
const pool = require("../config/database");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { logger, logWithUser, getUserContext } = require("../config/logger");
const router = express.Router();

router.post("/profile", authenticateToken, async (req, res) => {
  try {
    const [result] = await pool.execute(
      "SELECT u1.id, u1.first_name as firstName, u1.last_name as lastName, u1.email, u1.phone, u1.room_number as roomNumber, u1.whatsapp, u1.role, u2.first_name as poshakFirstName, u2.last_name as poshakLastName FROM users u1 left join poshak_assignments pa on u1.id=pa.assigned_student_id left join users u2 on pa.poshak_id=u2.id WHERE u1.id=?",
      [req.user.id]
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch your profile details." });
  }
  // res.json({
  //   id: req.user.id,
  //   firstName: req.user.first_name,
  //   lastName: req.user.last_name,
  //   email: req.user.email,
  //   phone: req.user.phone,
  //   roomNumber: req.user.room_number,
  //   poshak: req.user.poshak,
  //   whatsapp: req.user.whatsapp,
  // });
});

router.get(
  "/pending",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const [result] = await pool.execute(
        "SELECT id, first_name, last_name, email, phone, room_number FROM users WHERE is_approved = FALSE ORDER BY created_at"
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pending users" });
    }
  }
);

router.post(
  "/approve/:id",
  authenticateToken,
  requireRole(["admin"]),
  [
    param("id").isInt({ min: 1 }),
    body("role").isIn(["admin", "poshak_leader", "student"]),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ error: "Validation failed", details: errors.array() });
      }

      const { id } = req.params;
      const { role } = req.body;

      // Get user information before updating
      const [userResult] = await pool.execute(
        "SELECT first_name, last_name, email FROM users WHERE id = ?",
        [id]
      );

      if (userResult.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const approvedUser = userResult[0];

      await pool.execute(
        "UPDATE users SET is_approved = TRUE, role = ? WHERE id = ?",
        [role, id]
      );

      logger.info("User approved", {
        approvedUserId: id,
        approvedUserName: `${approvedUser.first_name} ${approvedUser.last_name}`,
        approvedUserEmail: approvedUser.email,
        role,
        adminId: req.user.id,
        adminName: `${req.user.first_name} ${req.user.last_name}`,
        ip: req.ip,
      });
      res.json({ message: "User approved successfully" });
    } catch (error) {
      logger.error("Failed to approve user", {
        error: error.message,
        userId: id,
        adminId: req.user.id,
        adminName: `${req.user.first_name} ${req.user.last_name}`,
        ip: req.ip,
      });
      res.status(500).json({ error: "Failed to approve user" });
    }
  }
);

router.get("/students", authenticateToken, async (req, res) => {
  try {
    // Admin can optionally see inactive students via query parameter
    const showInactive = req.query.showInactive === 'true' && req.user.role === 'admin';
    
    let query = `SELECT u1.id, u1.first_name, u1.last_name, u1.email, u1.phone, u1.whatsapp, u1.room_number, u1.is_monitor, u1.is_active,
            u2.first_name as poshak_first_name, u2.last_name as poshak_last_name 
     FROM users u1 
     LEFT JOIN poshak_assignments pa ON u1.id = pa.assigned_student_id 
     LEFT JOIN users u2 ON pa.poshak_id = u2.id 
     WHERE u1.role = ? AND u1.is_approved = TRUE`;
    
    // For non-admin users or when admin doesn't want to see inactive students
    if (!showInactive) {
      query += ' AND u1.is_active = TRUE';
    }
    
    query += ' ORDER BY u1.first_name';
    
    const [result] = await pool.execute(query, ["student"]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

router.get("/monitors", authenticateToken, async (req, res) => {
  try {
    const [result] = await pool.execute(
      "SELECT id, first_name, last_name FROM users WHERE role = ? AND is_monitor = TRUE AND is_approved = TRUE AND is_active = TRUE ORDER BY first_name",
      ["student"]
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch monitors" });
  }
});

router.get(
  "/all",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const [result] = await pool.execute(
        "SELECT id, first_name, last_name, email, phone, whatsapp, room_number, role, is_monitor, is_approved, is_active FROM users ORDER BY created_at DESC"
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  }
);

router.put(
  "/:id",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        firstName,
        lastName,
        email,
        phone,
        whatsapp,
        roomNumber,
        role,
        isMonitor,
        isApproved,
        isActive,
      } = req.body;

      // If removing monitor role, delete monitor assignments
      if (!isMonitor) {
        await pool.execute(
          "DELETE FROM monitor_assignments WHERE monitor_student_id = ?",
          [id]
        );
      }

      await pool.execute(
        "UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = ?, whatsapp = ?, room_number = ?, role = ?, is_monitor = ?, is_approved = ?, is_active = ? WHERE id = ?",
        [
          firstName,
          lastName,
          email,
          phone,
          whatsapp,
          roomNumber,
          role,
          isMonitor,
          isApproved,
          isActive,
          id,
        ]
      );

      logger.info("User updated", {
        updatedUserId: id,
        updatedUserName: `${firstName} ${lastName}`,
        isActive,
        adminId: req.user.id,
        adminName: `${req.user.first_name} ${req.user.last_name}`,
        ip: req.ip,
      });

      res.json({ message: "User updated successfully" });
    } catch (error) {
      logger.error("Failed to update user", {
        error: error.message,
        userId: id,
        adminId: req.user.id,
        ip: req.ip,
      });
      res.status(500).json({ error: "Failed to update user" });
    }
  }
);

router.put("/profile/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, whatsapp, roomNumber } = req.body;

    await pool.execute(
      "UPDATE users SET first_name = ?, last_name = ?, phone = ?, whatsapp = ?, room_number = ? WHERE id = ?",
      [firstName, lastName, phone, whatsapp, roomNumber, id]
    );

    res.json({ message: "User profile updated successfully" });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Failed to update user profile" });
  }
});

// Toggle user active status (soft delete/restore)
router.put(
  "/:id/toggle-active",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get current user status
      const [userResult] = await pool.execute(
        "SELECT first_name, last_name, email, is_active FROM users WHERE id = ?",
        [id]
      );

      if (userResult.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const user = userResult[0];
      const newActiveStatus = !user.is_active;

      await pool.execute(
        "UPDATE users SET is_active = ? WHERE id = ?",
        [newActiveStatus, id]
      );

      logger.info(`User ${newActiveStatus ? 'activated' : 'deactivated'}`, {
        userId: id,
        userName: `${user.first_name} ${user.last_name}`,
        userEmail: user.email,
        newStatus: newActiveStatus,
        adminId: req.user.id,
        adminName: `${req.user.first_name} ${req.user.last_name}`,
        ip: req.ip,
      });

      res.json({ 
        message: `User ${newActiveStatus ? 'activated' : 'deactivated'} successfully`,
        isActive: newActiveStatus 
      });
    } catch (error) {
      logger.error("Failed to toggle user active status", {
        error: error.message,
        userId: id,
        adminId: req.user.id,
        ip: req.ip,
      });
      res.status(500).json({ error: "Failed to toggle user active status" });
    }
  }
);

router.delete(
  "/:id",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      await pool.execute("DELETE FROM users WHERE id = ?", [id]);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  }
);

module.exports = router;
