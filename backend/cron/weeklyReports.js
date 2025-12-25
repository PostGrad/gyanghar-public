const cron = require("node-cron");
const pool = require("../config/database");
const emailService = require("../config/emailService");
const { logger } = require("../config/logger");

// Helper functions for data formatting and color schemes
const formatTime = (timeStr) => {
  if (!timeStr) return "-";
  return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDuration = (timeStr) => {
  if (!timeStr) return "-";
  const [hours, minutes] = timeStr.split(":");
  const h = parseInt(hours);
  const m = parseInt(minutes);
  if (h === 0 && m === 0) return "0 m";
  if (h === 0) return `${m} m`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} m`;
};

const getWakeupTimeClass = (timeStr) => {
  if (!timeStr) return "neutral";
  const [hours, minutes] = timeStr.split(":");
  const totalMinutes = parseInt(hours) * 60 + parseInt(minutes);
  const sixAM = 6 * 60;
  const sixFortyFiveAM = 6 * 60 + 45;
  if (totalMinutes <= sixAM) return "excellent";
  if (totalMinutes < sixFortyFiveAM) return "good";
  return "poor";
};

const getDurationClass = (timeStr, type) => {
  if (!timeStr) return "neutral";
  const [hours, minutes] = timeStr.split(":");
  const totalMinutes = parseInt(hours) * 60 + parseInt(minutes);

  if (type === "puja") {
    if (totalMinutes >= 30) return "excellent";
    if (totalMinutes >= 15) return "good";
    return "poor";
  }
  if (type === "reading") {
    if (totalMinutes >= 60) return "excellent";
    if (totalMinutes >= 30) return "good";
    return "poor";
  }
  if (type === "wasted") {
    if (totalMinutes === 0) return "excellent";
    if (totalMinutes <= 30) return "good";
    return "poor";
  }
  return "neutral";
};

const getMansiPujaClass = (count) => {
  if (count === 5) return "excellent";
  if (count >= 3) return "good";
  return "poor";
};

const getBooleanClass = (value) => {
  return value ? "excellent" : "poor";
};

const getKathaClass = (value) => {
  if (value === "zoom") return "excellent";
  if (value === "youtube") return "good";
  return "poor";
};

// CSS styles for email
const getEmailStyles = () => {
  return `
    <style>
      body { 
        font-family: Arial, sans-serif; 
        line-height: 1.6; 
        color: #333; 
        max-width: 1200px; 
        margin: 0 auto; 
        padding: 20px;
      }
      .header { 
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
        color: white; 
        padding: 30px; 
        border-radius: 10px; 
        text-align: center; 
        margin-bottom: 30px;
      }
      .summary-section {
        background: #f8f9fa;
        border-radius: 10px;
        padding: 25px;
        margin-bottom: 30px;
        border-left: 5px solid #667eea;
      }
      .summary-grid {
        display: flex;
        flex-direction: row;
        justify-content: space-around;
        gap: 15px;
        margin-top: 20px;
      }
      .summary-card {
        background: white;
        padding: 15px 25px;
        border-radius: 8px;
        text-align: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        flex: 1;
        min-width: 150px;
      }
      .summary-value {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 5px;
      }
      .summary-label {
        font-size: 12px;
        color: #666;
        text-transform: uppercase;
      }
      table { 
        width: 100%; 
        border-collapse: collapse; 
        margin: 20px 0; 
        background: white;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      }
      th { 
        background: #f1f3f4; 
        padding: 12px 8px; 
        text-align: left; 
        font-weight: 600;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 2px solid #e0e0e0;
      }
      td { 
        padding: 10px 8px; 
        border-bottom: 1px solid #f0f0f0; 
        font-size: 13px;
      }
      tr:hover { background: #f8f9fa; }
      .excellent { background: #d4edda; color: #155724; }
      .good { background: #fff3cd; color: #856404; }
      .poor { background: #f8d7da; color: #721c24; }
      .neutral { background: #e2e3e5; color: #6c757d; }
      .missing-row { background: #fff5f5; }
      .missing-row td { color: #e53e3e; font-weight: 500; }
      .badge {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
      }
      .footer {
        margin-top: 40px;
        padding: 20px;
        background: #f8f9fa;
        border-radius: 10px;
        font-size: 12px;
        color: #666;
        text-align: center;
      }
      .performance-indicator {
        display: inline-block;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        margin-right: 8px;
      }
      .week-info {
        background: white;
        padding: 20px;
        border-radius: 10px;
        margin-bottom: 20px;
        border: 1px solid #e0e0e0;
      }
    </style>
  `;
};

// Generate weekly report for a student
const generateWeeklyReport = async (studentId, weekStart, weekEnd) => {
  try {
    // Get student info with poshak leader details
    const [studentResult] = await pool.execute(
      `
      SELECT 
        u1.id, u1.first_name, u1.last_name, u1.email, u1.room_number,
        u2.first_name as poshak_first_name, u2.last_name as poshak_last_name, u2.email as poshak_email
      FROM users u1 
      LEFT JOIN poshak_assignments pa ON u1.id = pa.assigned_student_id 
      LEFT JOIN users u2 ON pa.poshak_id = u2.id 
      WHERE u1.id = ? AND u1.role = 'student' AND u1.is_approved = TRUE
    `,
      [studentId]
    );

    if (studentResult.length === 0) {
      return null;
    }

    const student = studentResult[0];

    // Get weekly entries
    const [entries] = await pool.execute(
      `
      SELECT 
        DATE_FORMAT(entry_date, '%Y-%m-%d') as entry_date,
        wakeup_time, mangala_aarti, morning_katha, morning_puja_time,
        vachanamrut_read, mast_meditation, cheshta, mansi_puja_count,
        reading_time, wasted_time, mantra_jap, notes,
        DAYNAME(entry_date) as day_name
      FROM accountability_entries 
      WHERE user_id = ? AND entry_date BETWEEN ? AND ?
      ORDER BY entry_date ASC
    `,
      [studentId, weekStart, weekEnd]
    );

    // Generate missing entries for the week
    const existingDates = new Set(entries.map((entry) => entry.entry_date));
    const allDates = [];

    for (
      let date = new Date(weekStart);
      date <= new Date(weekEnd);
      date.setDate(date.getDate() + 1)
    ) {
      const dateStr = date.toISOString().split("T")[0];
      allDates.push({
        date: dateStr,
        dayName: date.toLocaleDateString("en-US", { weekday: "long" }),
        exists: existingDates.has(dateStr),
      });
    }

    // Calculate performance summary
    const totalDays = allDates.length;
    const filledDays = entries.length;
    const completionRate = Math.round((filledDays / totalDays) * 100);

    // Calculate averages and performance metrics
    let avgWakeupMinutes = 0;
    let mangalaAartiCount = 0;
    let zoomKathaCount = 0;
    let youtubeKathaCount = 0;
    let avgPujaMinutes = 0;
    let vachanamrutCount = 0;
    let meditationCount = 0;
    let chesthaCount = 0;
    let avgMansiPuja = 0;
    let avgReadingMinutes = 0;
    let avgWastedMinutes = 0;
    let totalMantraJap = 0;

    entries.forEach((entry) => {
      if (entry.wakeup_time) {
        const [hours, minutes] = entry.wakeup_time.split(":");
        avgWakeupMinutes += parseInt(hours) * 60 + parseInt(minutes);
      }
      if (entry.mangala_aarti) mangalaAartiCount++;
      if (entry.morning_katha === "zoom") zoomKathaCount++;
      if (entry.morning_katha === "youtube") youtubeKathaCount++;
      if (entry.morning_puja_time) {
        const [hours, minutes] = entry.morning_puja_time.split(":");
        avgPujaMinutes += parseInt(hours) * 60 + parseInt(minutes);
      }
      if (entry.vachanamrut_read) vachanamrutCount++;
      if (entry.mast_meditation) meditationCount++;
      if (entry.cheshta) chesthaCount++;
      avgMansiPuja += entry.mansi_puja_count || 0;
      if (entry.reading_time) {
        const [hours, minutes] = entry.reading_time.split(":");
        avgReadingMinutes += parseInt(hours) * 60 + parseInt(minutes);
      }
      if (entry.wasted_time) {
        const [hours, minutes] = entry.wasted_time.split(":");
        avgWastedMinutes += parseInt(hours) * 60 + parseInt(minutes);
      }
      totalMantraJap += entry.mantra_jap || 0;
    });

    // Calculate averages
    if (filledDays > 0) {
      avgWakeupMinutes = Math.round(avgWakeupMinutes / filledDays);
      avgPujaMinutes = Math.round(avgPujaMinutes / filledDays);
      avgMansiPuja = Math.round(avgMansiPuja / filledDays);
      avgReadingMinutes = Math.round(avgReadingMinutes / filledDays);
      avgWastedMinutes = Math.round(avgWastedMinutes / filledDays);
    }

    // Generate performance score (0-100)
    let performanceScore = 0;
    let maxScore = 0;

    // Completion rate (20 points)
    performanceScore += (completionRate / 100) * 20;
    maxScore += 20;

    // Wake up time (15 points)
    if (avgWakeupMinutes <= 360) performanceScore += 15; // 6 AM or earlier
    else if (avgWakeupMinutes <= 405)
      performanceScore += 10; // 6:45 AM or earlier
    else performanceScore += 5;
    maxScore += 15;

    // Mangala Aarti (10 points)
    performanceScore += (mangalaAartiCount / totalDays) * 10;
    maxScore += 10;

    // Morning Katha (10 points)
    performanceScore +=
      ((zoomKathaCount * 1 + youtubeKathaCount * 0.7) / totalDays) * 10;
    maxScore += 10;

    // Puja time (15 points)
    if (avgPujaMinutes >= 30) performanceScore += 15;
    else if (avgPujaMinutes >= 15) performanceScore += 10;
    else performanceScore += 5;
    maxScore += 15;

    // Other activities (30 points total)
    performanceScore += (vachanamrutCount / totalDays) * 5; // 5 points
    performanceScore += (meditationCount / totalDays) * 5; // 5 points
    performanceScore += (chesthaCount / totalDays) * 5; // 5 points
    performanceScore += Math.min(avgMansiPuja / 5, 1) * 10; // 10 points
    performanceScore += Math.min(avgReadingMinutes / 60, 1) * 5; // 5 points
    maxScore += 30;

    performanceScore = Math.round((performanceScore / maxScore) * 100);

    return {
      student,
      entries,
      allDates,
      summary: {
        completionRate,
        filledDays,
        totalDays,
        avgWakeupTime:
          avgWakeupMinutes > 0
            ? `${Math.floor(avgWakeupMinutes / 60)}:${String(
                avgWakeupMinutes % 60
              ).padStart(2, "0")}`
            : "-",
        mangalaAartiPercentage: Math.round(
          (mangalaAartiCount / totalDays) * 100
        ),
        zoomKathaPercentage: Math.round((zoomKathaCount / totalDays) * 100),
        youtubeKathaPercentage: Math.round(
          (youtubeKathaCount / totalDays) * 100
        ),
        avgPujaTime:
          avgPujaMinutes > 0
            ? formatDuration(
                `${Math.floor(avgPujaMinutes / 60)}:${String(
                  avgPujaMinutes % 60
                ).padStart(2, "0")}`
              )
            : "-",
        vachanamrutPercentage: Math.round((vachanamrutCount / totalDays) * 100),
        meditationPercentage: Math.round((meditationCount / totalDays) * 100),
        chesthaPercentage: Math.round((chesthaCount / totalDays) * 100),
        avgMansiPuja: avgMansiPuja.toFixed(1),
        avgReadingTime:
          avgReadingMinutes > 0
            ? formatDuration(
                `${Math.floor(avgReadingMinutes / 60)}:${String(
                  avgReadingMinutes % 60
                ).padStart(2, "0")}`
              )
            : "-",
        avgWastedTime:
          avgWastedMinutes > 0
            ? formatDuration(
                `${Math.floor(avgWastedMinutes / 60)}:${String(
                  avgWastedMinutes % 60
                ).padStart(2, "0")}`
              )
            : "-",
        totalMantraJap,
        performanceScore,
      },
    };
  } catch (error) {
    logger.error("Error generating weekly report", {
      studentId,
      error: error.message,
    });
    return null;
  }
};

// Generate HTML email content
const generateEmailHTML = (reportData, weekStart, weekEnd) => {
  const { student, entries, allDates, summary } = reportData;

  const weekStartFormatted = new Date(weekStart).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const weekEndFormatted = new Date(weekEnd).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Performance indicators
  const getPerformanceColor = (score) => {
    if (score >= 80) return "#28a745";
    if (score >= 60) return "#ffc107";
    return "#dc3545";
  };

  const getPerformanceText = (score) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    return "Needs Improvement";
  };

  // Create table rows
  let tableRows = "";

  allDates.forEach((dateInfo) => {
    const entry = entries.find((e) => e.entry_date === dateInfo.date);

    if (!entry) {
      // Missing entry row
      tableRows += `
        <tr class="missing-row">
          <td><strong>${new Date(
            dateInfo.date
          ).toLocaleDateString()}</strong><br><small>${
        dateInfo.dayName
      }</small></td>
          <td colspan="11" style="text-align: center; font-weight: bold;">Missing Entry</td>
        </tr>
      `;
    } else {
      // Regular entry row
      tableRows += `
        <tr>
          <td><strong>${new Date(
            entry.entry_date
          ).toLocaleDateString()}</strong><br><small>${
        entry.day_name
      }</small></td>
          <td><span class="badge ${getWakeupTimeClass(
            entry.wakeup_time
          )}">${formatTime(entry.wakeup_time)}</span></td>
          <td><span class="badge ${getBooleanClass(entry.mangala_aarti)}">${
        entry.mangala_aarti ? "Yes" : "No"
      }</span></td>
          <td><span class="badge ${getKathaClass(entry.morning_katha)}">${
        entry.morning_katha === "zoom"
          ? "Zoom"
          : entry.morning_katha === "youtube"
          ? "YouTube"
          : "No"
      }</span></td>
          <td><span class="badge ${getDurationClass(
            entry.morning_puja_time,
            "puja"
          )}">${formatDuration(entry.morning_puja_time)}</span></td>
          <td><span class="badge ${getBooleanClass(entry.vachanamrut_read)}">${
        entry.vachanamrut_read ? "Yes" : "No"
      }</span></td>
          <td><span class="badge ${getBooleanClass(entry.mast_meditation)}">${
        entry.mast_meditation ? "Yes" : "No"
      }</span></td>
          <td><span class="badge ${getBooleanClass(entry.cheshta)}">${
        entry.cheshta ? "Yes" : "No"
      }</span></td>
          <td><span class="badge ${getMansiPujaClass(
            entry.mansi_puja_count
          )}">${entry.mansi_puja_count || 0}</span></td>
          <td><span class="badge ${getDurationClass(
            entry.reading_time,
            "reading"
          )}">${formatDuration(entry.reading_time)}</span></td>
          <td><span class="badge ${getDurationClass(
            entry.wasted_time,
            "wasted"
          )}">${formatDuration(entry.wasted_time)}</span></td>
          <td><span class="badge neutral">${entry.mantra_jap || 0}</span></td>
        </tr>
      `;
    }
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Weekly Adhyatmik Report</title>
      ${getEmailStyles()}
    </head>
    <body>
      <div class="header">
        <h1>📊 Weekly Adhyatmik Report</h1>
        <h2>${student.first_name} ${student.last_name}</h2>
        <p>Room: ${student.room_number || "Not Assigned"}</p>
      </div>

      <div class="week-info">
        <h3>📅 Report Period</h3>
        <p><strong>From:</strong> ${weekStartFormatted}</p>
        <p><strong>To:</strong> ${weekEndFormatted}</p>
      </div>

      <div class="summary-section">
        <h3>📈 Performance Summary</h3>
        <div style="text-align: center; margin: 20px 0;">
          <div style="display: inline-block; background: white; padding: 20px; border-radius: 50%; border: 8px solid ${getPerformanceColor(
            summary.performanceScore
          )};">
            <div class="summary-value" style="color: ${getPerformanceColor(
              summary.performanceScore
            )}; font-size: 36px;">
              ${summary.performanceScore}%
            </div>
            <div class="summary-label" style="color: ${getPerformanceColor(
              summary.performanceScore
            )};">
              ${getPerformanceText(summary.performanceScore)}
            </div>
          </div>
        </div>
        
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-value" style="color: ${
              summary.completionRate >= 80
                ? "#28a745"
                : summary.completionRate >= 60
                ? "#ffc107"
                : "#dc3545"
            };">
              ${summary.completionRate}%
            </div>
            <div class="summary-label">Completion Rate</div>
            <div style="font-size: 10px; color: #888;">${summary.filledDays}/${
    summary.totalDays
  } days</div>
          </div>
          
          <div class="summary-card">
            <div class="summary-value">${summary.avgWakeupTime}</div>
            <div class="summary-label">Avg Wake Time</div>
          </div>
          
          <div class="summary-card">
            <div class="summary-value" style="color: ${
              summary.mangalaAartiPercentage >= 80
                ? "#28a745"
                : summary.mangalaAartiPercentage >= 60
                ? "#ffc107"
                : "#dc3545"
            };">
              ${summary.mangalaAartiPercentage}%
            </div>
            <div class="summary-label">Mangala Aarti</div>
          </div>
          
          <div class="summary-card">
            <div class="summary-value" style="color: ${
              summary.zoomKathaPercentage >= 80
                ? "#28a745"
                : summary.zoomKathaPercentage >= 60
                ? "#ffc107"
                : "#dc3545"
            };">
              ${summary.zoomKathaPercentage}%
            </div>
            <div class="summary-label">Zoom Katha</div>
          </div>
          
          <div class="summary-card">
            <div class="summary-value">${summary.avgPujaTime}</div>
            <div class="summary-label">Avg Puja Time</div>
          </div>
          
          <div class="summary-card">
            <div class="summary-value">${summary.avgMansiPuja}</div>
            <div class="summary-label">Avg Mansi Puja</div>
          </div>
          
          <div class="summary-card">
            <div class="summary-value">${summary.avgReadingTime}</div>
            <div class="summary-label">Avg Reading</div>
          </div>
          
          <div class="summary-card">
            <div class="summary-value">${summary.totalMantraJap}</div>
            <div class="summary-label">Total Mantra Jap</div>
          </div>
        </div>
      </div>

      <h3>📋 Detailed Daily Report</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Wake Up</th>
            <th>Mangala Aarti</th>
            <th>Morning Katha</th>
            <th>Puja Time</th>
            <th>Vachanamrut</th>
            <th>Meditation</th>
            <th>Cheshta</th>
            <th>Mansi Puja</th>
            <th>Reading</th>
            <th>Wasted Time</th>
            <th>Mantra Jap</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      <div class="footer">
        <p><strong>🏠 Gyan Ghar Accountability System</strong></p>
        <p>This is an automated weekly report. Please do not reply to this email.</p>
        <p>For any questions or concerns, please contact your Poshak Leader or Admin.</p>
        <p><em>Generated on ${new Date().toLocaleString()}</em></p>
      </div>
    </body>
    </html>
  `;
};

// Get email recipients for a student
const getEmailRecipients = async (student) => {
  const recipients = {
    to: [student.email],
    cc: [],
  };

  if (student.poshak_email) {
    // Student has a poshak leader
    recipients.cc.push(student.poshak_email);

    // Add all admins to CC
    const [admins] = await pool.execute(`
      SELECT email FROM users WHERE role = 'admin' AND is_approved = TRUE AND email IS NOT NULL
    `);
    recipients.cc.push(...admins.map((admin) => admin.email));
  } else {
    // No poshak leader assigned, add all poshak leaders and admins to CC
    const [poshakLeadersAndAdmins] = await pool.execute(`
      SELECT email FROM users 
      WHERE (role = 'poshak_leader' OR role = 'admin') 
      AND is_approved = TRUE AND email IS NOT NULL
    `);
    recipients.cc.push(...poshakLeadersAndAdmins.map((user) => user.email));
  }

  // Remove duplicates
  recipients.cc = [...new Set(recipients.cc)];

  return recipients;
};

// Calculate student performance score for sorting
const calculatePerformanceScore = (summary) => {
  let score = 0;
  
  // Days reported (most important - weight: 100 per day)
  score += summary.daysReported * 100;
  
  // Task completion scores
  score += summary.mangalaAartiCount * 5;
  score += summary.vachanamrutCount * 5;
  score += summary.cheshtaCount * 5;
  score += (summary.kathaZoom * 5) + (summary.kathaYoutube * 3);
  score += Math.min(summary.avgPujaMinutes / 6, 5); // Max 5 points (30 min = 5 points)
  score += Math.min(summary.meditationSum / 3, 5); // Max 5 points (15 min = 5 points)
  score += (summary.mansiPujaSum / summary.mansiPujaMax) * 10; // Max 10 points
  score += Math.min(summary.readingSum / 12, 5); // Max 5 points (60 min = 5 points)
  score -= Math.min(summary.wastedSum / 6, 5); // Penalize wasted time
  
  return Math.round(score);
};

// Generate summary for all students
const generateAllStudentsSummary = async (weekStart, weekEnd) => {
  try {
    // Get all active students with their accountability entries for the week
    const [students] = await pool.execute(`
      SELECT 
        u.id, u.first_name, u.last_name, u.room_number
      FROM users u
      WHERE u.role = 'student' AND u.is_approved = TRUE AND u.is_active = TRUE
      ORDER BY u.first_name, u.last_name
    `);

    const studentsWithSummary = [];
    const studentsNoData = [];

    for (const student of students) {
      // Get entries for this student for the week
      const [entries] = await pool.execute(`
        SELECT *
        FROM accountability_entries
        WHERE user_id = ? AND entry_date >= ? AND entry_date <= ?
        ORDER BY entry_date
      `, [student.id, weekStart, weekEnd]);

      if (entries.length === 0) {
        studentsNoData.push(student);
        continue;
      }

      // Calculate summary statistics
      const daysReported = entries.length;

      // Wake up time average
      const wakeupTimes = entries.filter(e => e.wakeup_time).map(e => {
        const [hours, minutes] = e.wakeup_time.split(':');
        return parseInt(hours) * 60 + parseInt(minutes);
      });
      const avgWakeupMinutes = wakeupTimes.length > 0 
        ? Math.round(wakeupTimes.reduce((a, b) => a + b, 0) / wakeupTimes.length)
        : 0;

      // Task counts
      const mangalaAartiCount = entries.filter(e => e.mangala_aarti).length;
      const kathaZoom = entries.filter(e => e.morning_katha === 'zoom').length;
      const kathaYoutube = entries.filter(e => e.morning_katha === 'youtube').length;
      const kathaMissed = entries.filter(e => e.morning_katha === 'no').length;
      const vachanamrutCount = entries.filter(e => e.vachanamrut_read).length;
      const cheshtaCount = entries.filter(e => e.cheshta).length;

      // Puja time average
      const pujaTimes = entries.filter(e => e.morning_puja_time).map(e => {
        const [hours, minutes] = e.morning_puja_time.split(':');
        return parseInt(hours) * 60 + parseInt(minutes);
      });
      const avgPujaMinutes = pujaTimes.length > 0
        ? Math.round(pujaTimes.reduce((a, b) => a + b, 0) / pujaTimes.length)
        : 0;

      // Meditation sum
      const meditationSum = entries.reduce((sum, e) => sum + (e.meditation_watch_time || 0), 0);

      // Mansi Puja
      const mansiPujaSum = entries.reduce((sum, e) => sum + (e.mansi_puja_count || 0), 0);
      const mansiPujaMax = entries.length * 5;

      // Reading time sum
      const readingSum = entries.reduce((sum, e) => {
        if (!e.reading_time) return sum;
        const [hours, minutes] = e.reading_time.split(':');
        return sum + parseInt(hours) * 60 + parseInt(minutes);
      }, 0);

      // Wasted time sum
      const wastedSum = entries.reduce((sum, e) => {
        if (!e.wasted_time) return sum;
        const [hours, minutes] = e.wasted_time.split(':');
        return sum + parseInt(hours) * 60 + parseInt(minutes);
      }, 0);

      // Mantra Jap sum
      const mantraJapSum = entries.reduce((sum, e) => sum + (e.mantra_jap || 0), 0);

      const summary = {
        daysReported,
        avgWakeupMinutes,
        mangalaAartiCount,
        kathaZoom,
        kathaYoutube,
        kathaMissed,
        avgPujaMinutes,
        vachanamrutCount,
        meditationSum,
        cheshtaCount,
        mansiPujaSum,
        mansiPujaMax,
        readingSum,
        wastedSum,
        mantraJapSum,
      };

      const performanceScore = calculatePerformanceScore(summary);

      studentsWithSummary.push({
        student,
        summary,
        performanceScore,
      });
    }

    // Sort by performance score (best to worst)
    studentsWithSummary.sort((a, b) => b.performanceScore - a.performanceScore);

    // Sort no-data students alphabetically
    studentsNoData.sort((a, b) => 
      `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
    );

    return {
      studentsWithSummary,
      studentsNoData,
      totalStudents: students.length,
    };
  } catch (error) {
    logger.error("Error generating all students summary", { error: error.message });
    throw error;
  }
};

// Generate HTML email for all students summary
const generateAllStudentsSummaryEmail = (data, weekStart, weekEnd) => {
  const { studentsWithSummary, studentsNoData, totalStudents } = data;
  
  const formatMinutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const formatDurationShort = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const weekStartDate = new Date(weekStart).toLocaleDateString('en-GB');
  const weekEndDate = new Date(weekEnd).toLocaleDateString('en-GB');

  let tableRows = '';
  studentsWithSummary.forEach((item, index) => {
    const { student, summary } = item;
    const avgWakeupTime = formatMinutesToTime(summary.avgWakeupMinutes);

    tableRows += `
      <tr>
        <td style="text-align: center;">${index + 1}</td>
        <td><strong>${student.first_name} ${student.last_name}</strong></td>
        <td style="text-align: center;">${summary.daysReported}</td>
        <td style="text-align: center;">${avgWakeupTime}</td>
        <td style="text-align: center;">${summary.mangalaAartiCount}/${summary.daysReported}</td>
        <td style="text-align: center;">Z:${summary.kathaZoom} Y:${summary.kathaYoutube} M:${summary.kathaMissed}</td>
        <td style="text-align: center;">${formatDurationShort(summary.avgPujaMinutes)}</td>
        <td style="text-align: center;">${summary.vachanamrutCount}/${summary.daysReported}</td>
        <td style="text-align: center;">${formatDurationShort(summary.meditationSum)}</td>
        <td style="text-align: center;">${summary.cheshtaCount}/${summary.daysReported}</td>
        <td style="text-align: center;">${summary.mansiPujaSum}/${summary.mansiPujaMax}</td>
        <td style="text-align: center;">${formatDurationShort(summary.readingSum)}</td>
        <td style="text-align: center;">${formatDurationShort(summary.wastedSum)}</td>
        <td style="text-align: center;">${summary.mantraJapSum}</td>
      </tr>
    `;
  });

  let noDataSection = '';
  if (studentsNoData.length > 0) {
    const noDataList = studentsNoData.map(s => 
      `<li style="padding: 8px; background: #fff; margin-bottom: 5px; border-radius: 5px; border-left: 3px solid #e53e3e;">
        <strong>${s.first_name} ${s.last_name}</strong> - Room ${s.room_number || 'N/A'}
      </li>`
    ).join('');

    noDataSection = `
      <div style="background: #fff5f5; padding: 20px; border-radius: 10px; margin-top: 30px; border: 2px solid #feb2b2;">
        <h2 style="color: #e53e3e; margin-top: 0;">⚠️ Students with No Data (${studentsNoData.length})</h2>
        <p style="color: #666;">The following students have not filled their accountability form even once during this week:</p>
        <ul style="list-style: none; padding: 0;">
          ${noDataList}
        </ul>
      </div>
    `;
  }

  return `
    ${getEmailStyles()}
    <div class="header">
      <h1 style="margin: 0; font-size: 32px;">📊 Weekly Adhyatmik Summary Report</h1>
      <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">
        ${weekStartDate} - ${weekEndDate}
      </p>
    </div>

    <div class="week-info">
      <h2 style="margin-top: 0; color: #667eea;">Summary Overview</h2>
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-value" style="color: #667eea;">${totalStudents}</div>
          <div class="summary-label">Total Students</div>
        </div>
        <div class="summary-card">
          <div class="summary-value" style="color: #48bb78;">${studentsWithSummary.length}</div>
          <div class="summary-label">Reported</div>
        </div>
        <div class="summary-card">
          <div class="summary-value" style="color: #f56565;">${studentsNoData.length}</div>
          <div class="summary-label">No Data</div>
        </div>
        <div class="summary-card">
          <div class="summary-value" style="color: #4299e1;">${Math.round((studentsWithSummary.length / totalStudents) * 100)}%</div>
          <div class="summary-label">Participation Rate</div>
        </div>
      </div>
    </div>

    <div style="background: white; padding: 20px; border-radius: 10px; overflow-x: auto;">
      <h2 style="margin-top: 0; color: #667eea;">Student Performance Summary</h2>
      <p style="color: #666; margin-bottom: 20px;">Students are ranked by number of days reported and overall task completion (best to worst)</p>
      
      <table>
        <thead>
          <tr>
            <th style="text-align: center;">#</th>
            <th>Name</th>
            <th style="text-align: center;">Days</th>
            <th style="text-align: center;">Avg Wakeup Time</th>
            <th style="text-align: center;">Mangala Aarti</th>
            <th style="text-align: center;">Katha</th>
            <th style="text-align: center;">Avg Puja Time</th>
            <th style="text-align: center;">Vachanamrut</th>
            <th style="text-align: center;">Meditation Time</th>
            <th style="text-align: center;">Cheshta</th>
            <th style="text-align: center;">Mansi Puja Count</th>
            <th style="text-align: center;">Reading Time</th>
            <th style="text-align: center;">Wasted Time</th>
            <th style="text-align: center;">Mantra Jap Count</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>

    ${noDataSection}

    <div class="footer">
      <p><strong>Note:</strong> This is an automated weekly summary sent to all Poshak Leaders and Admins.</p>
      <p>Legend: Z=Zoom, Y=YouTube, M=Missed | Format: "X/Y" means X days out of Y total days</p>
      <p style="margin-top: 15px; color: #999;">Generated on ${new Date().toLocaleString('en-IN')}</p>
    </div>
  `;
};

// Main function to send weekly reports
const sendWeeklyReports = async () => {
  try {
    logger.info("Starting weekly summary report generation...");

    // Calculate previous week's dates (Monday to Sunday)
    const today = new Date();
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - today.getDay() - 6); // Last Monday

    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6); // Last Sunday

    const weekStart = lastMonday.toISOString().split("T")[0];
    const weekEnd = lastSunday.toISOString().split("T")[0];

    logger.info(`Generating summary report for week: ${weekStart} to ${weekEnd}`);

    // Generate all students summary
    const summaryData = await generateAllStudentsSummary(weekStart, weekEnd);

    // Get all poshak leaders and admins
    const [recipients] = await pool.execute(`
      SELECT DISTINCT email, first_name, last_name
      FROM users
      WHERE (role = 'poshak_leader' OR role = 'admin') AND is_approved = TRUE AND is_active = TRUE
      ORDER BY first_name, last_name
    `);

    if (recipients.length === 0) {
      logger.warn("No poshak leaders or admins found to send report to");
      return;
    }

    const recipientEmails = recipients.map(r => r.email);
    logger.info(`Sending summary report to ${recipientEmails.length} recipients`);

    // Generate email HTML
    const emailHTML = generateAllStudentsSummaryEmail(summaryData, weekStart, weekEnd);

    // Send email to all poshak leaders and admins
    await emailService.sendEmail({
      to: recipientEmails,
      subject: `📊 Weekly Adhyatmik Summary - All Students (${new Date(weekStart).toLocaleDateString()} - ${new Date(weekEnd).toLocaleDateString()})`,
      html: emailHTML,
    });

    logger.info(`Weekly summary report sent successfully to ${recipientEmails.length} recipients`);
    logger.info(`Report included ${summaryData.studentsWithSummary.length} students with data and ${summaryData.studentsNoData.length} students with no data`);

  } catch (error) {
    logger.error("Error in weekly summary report cron job", { error: error.message, stack: error.stack });
  }
};

// Schedule cron job for every Monday at 6 PM
// Format: second minute hour day month dayOfWeek
const scheduleWeeklyReports = () => {
  // Get cron schedule from environment or use default (Monday 6 PM)
  const cronSchedule = process.env.WEEKLY_REPORT_CRON_SCHEDULE || "0 0 18 * * 1";
  const timezone = process.env.CRON_TIMEZONE || "Asia/Kolkata";

  cron.schedule(
    cronSchedule,
    async () => {
      logger.info("Weekly report cron job triggered");
      await sendWeeklyReports();
    },
    {
      scheduled: true,
      timezone: timezone,
    }
  );

  logger.info(`Weekly report cron job scheduled with pattern: ${cronSchedule} (${timezone})`);
};

// Export functions for testing
module.exports = {
  scheduleWeeklyReports,
  sendWeeklyReports,
  generateWeeklyReport,
};
