const express = require("express");
const pool = require("../config/database");
const { authenticateToken, requireRole } = require("../middleware/auth");
const router = express.Router();

// Get all poshak leaders
router.get(
  "/poshaks",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const [result] = await pool.execute(
        "SELECT id, first_name, last_name FROM users WHERE role = ? AND is_approved = TRUE",
        ["poshak_leader"]
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch poshaks" });
    }
  }
);

// Assign poshak to students
router.post(
  "/poshak",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { poshakId, studentIds } = req.body;

      // Remove existing assignments for these students
      if (studentIds.length > 0) {
        const placeholders = studentIds.map(() => "?").join(",");
        await pool.execute(
          `DELETE FROM poshak_assignments WHERE assigned_student_id IN (${placeholders})`,
          studentIds
        );
      }

      // Add new assignments
      for (const studentId of studentIds) {
        await pool.execute(
          "INSERT INTO poshak_assignments (poshak_id, assigned_student_id) VALUES (?, ?)",
          [poshakId, studentId]
        );
      }

      res.json({ message: "Poshak assignments updated" });
    } catch (error) {
      res.status(500).json({ error: "Failed to assign poshak" });
    }
  }
);

// Get poshak assignments
router.get("/poshak", authenticateToken, async (req, res) => {
  try {
    const [result] = await pool.execute(`
      SELECT pa.*, 
             p.first_name as poshak_first_name, p.last_name as poshak_last_name,
             s.first_name as student_first_name, s.last_name as student_last_name, s.room_number
      FROM poshak_assignments pa
      JOIN users p ON pa.poshak_id = p.id
      JOIN users s ON pa.assigned_student_id = s.id
      ORDER BY p.first_name, s.first_name
    `);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch poshak assignments" });
  }
});

// Assign monitor to students
router.post(
  "/monitor",
  authenticateToken,
  requireRole(["admin", "poshak_leader"]),
  async (req, res) => {
    try {
      const { monitorId, studentIds } = req.body;

      // Update user to be monitor
      await pool.execute("UPDATE users SET is_monitor = TRUE WHERE id = ?", [
        monitorId,
      ]);

      // Remove existing assignments for these students
      if (studentIds.length > 0) {
        const placeholders = studentIds.map(() => "?").join(",");
        await pool.execute(
          `DELETE FROM monitor_assignments WHERE assigned_student_id IN (${placeholders})`,
          studentIds
        );
      }

      // Add new assignments
      for (const studentId of studentIds) {
        await pool.execute(
          "INSERT INTO monitor_assignments (monitor_student_id, assigned_student_id) VALUES (?, ?)",
          [monitorId, studentId]
        );
      }

      res.json({ message: "Monitor assignments updated" });
    } catch (error) {
      res.status(500).json({ error: "Failed to assign monitor" });
    }
  }
);

// Get monitor assignments
router.get("/monitor", authenticateToken, async (req, res) => {
  try {
    const [result] = await pool.execute(`
      SELECT ma.*, 
             m.first_name as monitor_first_name, m.last_name as monitor_last_name,
             s.first_name as student_first_name, s.last_name as student_last_name, s.room_number
      FROM monitor_assignments ma
      JOIN users m ON ma.monitor_student_id = m.id
      JOIN users s ON ma.assigned_student_id = s.id
      ORDER BY m.first_name, s.first_name
    `);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch monitor assignments" });
  }
});

// Get students assigned to a specific monitor
router.get(
  "/monitor/:monitorId/students",
  authenticateToken,
  async (req, res) => {
    try {
      const { monitorId } = req.params;
      const [result] = await pool.execute(
        `
      SELECT s.id, s.first_name, s.last_name, s.room_number
      FROM monitor_assignments ma
      JOIN users s ON ma.assigned_student_id = s.id
      WHERE ma.monitor_student_id = ?
      ORDER BY s.first_name, s.last_name
    `,
        [monitorId]
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch assigned students" });
    }
  }
);

// Delete poshak assignment
router.delete(
  "/poshak/:id",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      await pool.execute("DELETE FROM poshak_assignments WHERE id = ?", [id]);
      res.json({ message: "Poshak assignment deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete poshak assignment" });
    }
  }
);

// Delete monitor assignment
router.delete(
  "/monitor/:id",
  authenticateToken,
  requireRole(["admin", "poshak_leader"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Delete the assignment
      await pool.execute("DELETE FROM monitor_assignments WHERE id = ?", [id]);

      res.json({ message: "Monitor assignment deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete monitor assignment" });
    }
  }
);

module.exports = router;
