import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { accountability, assignments, users } from "../utils/api";
import { useToast } from "../contexts/ToastContext";
import { exportToExcel } from "../utils/excelExport";
import { FaFileExcel } from "react-icons/fa";

const ReportPage = ({ user }) => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  // State management
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignedStudents, setAssignedStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  // Filter states - Default to last 7 days
  const [fromDate, setFromDate] = useState(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7); // 7 days ago
    return sevenDaysAgo.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return yesterday.toISOString().split("T")[0];
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Table states (similar to dashboard)
  const [sortConfig, setSortConfig] = useState({
    key: "entry_date",
    direction: "desc",
  });
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    entryDate: true,
    wakeupTime: true,
    mangalaAarti: true,
    morningKatha: true,
    pujaTime: true,
    vachanamrut: true,
    meditation: true,
    cheshta: true,
    mansiPuja: true,
    readingTime: true,
    wastedTime: true,
    mantraJap: true,
    poshakLeader: false,
    notes: false,
  });
  const [columnOrder, setColumnOrder] = useState([
    "entryDate",
    "wakeupTime",
    "mangalaAarti",
    "morningKatha",
    "pujaTime",
    "vachanamrut",
    "meditation",
    "cheshta",
    "mansiPuja",
    "readingTime",
    "wastedTime",
    "mantraJap",
    "poshakLeader",
    "notes",
  ]);

  useEffect(() => {
    loadUserSettings();
    fetchAssignedStudents();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [fromDate, toDate, selectedStudentId, currentPage, sortConfig]);

  // Calculate pagination when entries change
  useEffect(() => {
    if (entries.length > 0 || fromDate) {
      const missingEntries = generateMissingEntries();
      const totalEntries = entries.length + missingEntries.length;
      const totalPages = Math.ceil(totalEntries / 15);

      setPagination({
        page: currentPage,
        limit: 15,
        total: totalEntries,
        totalPages,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1,
      });
    }
  }, [entries, fromDate, toDate, selectedStudentId, currentPage]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showColumnPicker && !event.target.closest(".column-picker")) {
        setShowColumnPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showColumnPicker]);

  const loadUserSettings = async () => {
    try {
      const settings = await accountability.getUserSettings();
      if (settings.data?.reportColumnOrder) {
        setColumnOrder(settings.data.reportColumnOrder);
      }
      if (settings.data?.reportVisibleColumns) {
        setVisibleColumns((prev) => ({
          ...prev,
          ...settings.data.reportVisibleColumns,
        }));
      }
    } catch (error) {
      showError("Failed to load user settings");
    }
  };

  const saveUserSettings = async (newColumnOrder, newVisibleColumns) => {
    try {
      await accountability.updateUserSettings({
        reportColumnOrder: newColumnOrder,
        reportVisibleColumns: newVisibleColumns,
      });
      showSuccess("Report settings saved");
    } catch (error) {
      showError("Failed to save report settings");
    }
  };

  const fetchAssignedStudents = async () => {
    if (user?.is_monitor) {
      try {
        const response = await assignments.getAssignedStudents(user.id);
        setAssignedStudents(response.data);
      } catch (error) {}
    }
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const params = {
        fromDate,
        toDate,
        userId: selectedStudentId || user.id,
        // Don't use pagination from backend - we'll handle it in frontend
        page: 1,
        limit: 15, // Get all entries for the date range
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction.toUpperCase(),
      };

      const response = await accountability.report(params);
      setEntries(response.data.entries);
    } catch (error) {
      showError("Failed to fetch report data");
    } finally {
      setLoading(false);
    }
  };

  const generateMissingEntries = () => {
    const currentUserId = selectedStudentId || user.id;
    const existingDates = new Set(entries.map((entry) => entry.entry_date));
    const missingEntries = [];

    const start = new Date(fromDate);
    const end = new Date(toDate);

    for (
      let date = new Date(start);
      date <= end;
      date.setDate(date.getDate() + 1)
    ) {
      const dateStr = date.toISOString().split("T")[0];
      if (!existingDates.has(dateStr)) {
        missingEntries.push({
          id: `missing-${dateStr}`,
          entry_date: dateStr,
          user_id: currentUserId,
          isMissing: true,
          first_name: selectedStudentId
            ? assignedStudents.find((s) => s.id === selectedStudentId)
                ?.first_name || "Unknown"
            : user.firstName,
          last_name: selectedStudentId
            ? assignedStudents.find((s) => s.id === selectedStudentId)
                ?.last_name || ""
            : user.lastName,
        });
      }
    }

    return missingEntries;
  };

  const handleSort = (column) => {
    let direction = "asc";
    if (sortConfig.key === column && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key: column, direction });
    setCurrentPage(1); // Reset to first page when sorting
  };

  const handleRowClick = (entry) => {
    if (entry.isMissing) {
      // Navigate to daily form for missing entry
      navigate("/daily-form", {
        state: {
          targetDate: entry.entry_date,
          targetUserId: entry.user_id,
          readOnly: false,
        },
      });
    } else {
      // Navigate to daily form with existing entry data
      navigate("/daily-form", {
        state: {
          entryData: entry,
          readOnly: false,
          targetDate: entry.entry_date,
          targetUserId: entry.user_id,
        },
      });
    }
  };

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

  // Calculate summary statistics for the entries
  const calculateSummary = () => {
    // Only calculate for actual entries (not missing ones)
    const actualEntries = entries.filter(e => !e.isMissing);
    
    if (actualEntries.length === 0) {
      return null;
    }

    // Wake up time average
    const wakeupTimes = actualEntries.filter(e => e.wakeup_time).map(e => {
      const [hours, minutes] = e.wakeup_time.split(':');
      return parseInt(hours) * 60 + parseInt(minutes);
    });
    const avgWakeupMinutes = wakeupTimes.length > 0 
      ? Math.round(wakeupTimes.reduce((a, b) => a + b, 0) / wakeupTimes.length)
      : 0;
    const avgWakeupHours = Math.floor(avgWakeupMinutes / 60);
    const avgWakeupMins = avgWakeupMinutes % 60;

    // Mangala Aarti count
    const mangalaAartiCount = actualEntries.filter(e => e.mangala_aarti).length;

    // Morning Katha counts
    const kathaZoom = actualEntries.filter(e => e.morning_katha === 'zoom').length;
    const kathaYoutube = actualEntries.filter(e => e.morning_katha === 'youtube').length;
    const kathaMissed = actualEntries.filter(e => e.morning_katha === 'no').length;

    // Puja time average
    const pujaTimes = actualEntries.filter(e => e.morning_puja_time).map(e => {
      const [hours, minutes] = e.morning_puja_time.split(':');
      return parseInt(hours) * 60 + parseInt(minutes);
    });
    const avgPujaMinutes = pujaTimes.length > 0
      ? Math.round(pujaTimes.reduce((a, b) => a + b, 0) / pujaTimes.length)
      : 0;

    // Vachanamrut count
    const vachanamrutCount = actualEntries.filter(e => e.vachanamrut_read).length;

    // Meditation time sum
    const meditationSum = actualEntries.reduce((sum, e) => sum + (e.meditation_watch_time || 0), 0);

    // Cheshta count
    const cheshtaCount = actualEntries.filter(e => e.cheshta).length;

    // Mansi Puja sum
    const mansiPujaSum = actualEntries.reduce((sum, e) => sum + (e.mansi_puja_count || 0), 0);
    const mansiPujaMax = actualEntries.length * 5;

    // Reading time sum
    const readingSum = actualEntries.reduce((sum, e) => {
      if (!e.reading_time) return sum;
      const [hours, minutes] = e.reading_time.split(':');
      return sum + parseInt(hours) * 60 + parseInt(minutes);
    }, 0);

    // Wasted time sum
    const wastedSum = actualEntries.reduce((sum, e) => {
      if (!e.wasted_time) return sum;
      const [hours, minutes] = e.wasted_time.split(':');
      return sum + parseInt(hours) * 60 + parseInt(minutes);
    }, 0);

    // Mantra Jap sum
    const mantraJapSum = actualEntries.reduce((sum, e) => sum + (e.mantra_jap || 0), 0);

    return {
      count: actualEntries.length,
      avgWakeupTime: `${String(avgWakeupHours).padStart(2, '0')}:${String(avgWakeupMins).padStart(2, '0')}`,
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
  };

  const summary = calculateSummary();

  const handleExportToExcel = async () => {
    try {
      // Fetch fresh user data to ensure we have the correct name
      const response = await users.getStudents();
      const currentStudent = response.data.find(s => s.id === user?.id);
      
      const studentInfo = {
        name: currentStudent 
          ? `${currentStudent.first_name} ${currentStudent.last_name}`
          : `${user?.first_name || user?.firstName || ''} ${user?.last_name || user?.lastName || ''}`.trim() || 'Unknown',
        mobile: currentStudent?.phone || currentStudent?.whatsapp || user?.phone || user?.whatsapp,
      };

      const dateRange = {
        from: fromDate,
        to: toDate,
      };

      exportToExcel(entries, summary, studentInfo, dateRange, columnOrder, visibleColumns);
      showSuccess("Report exported successfully!");
    } catch (error) {
      showError("Failed to export report");
    }
  };

  // Generate missing entries for the date range
  const missingEntries = generateMissingEntries();

  // Combine actual entries with missing entries and sort
  const allEntries = [...entries, ...missingEntries].sort((a, b) => {
    if (sortConfig.key === "entry_date") {
      const direction = sortConfig.direction === "desc" ? -1 : 1;
      return direction * a.entry_date.localeCompare(b.entry_date);
    }
    return 0;
  });

  // Apply pagination to the combined results (limit to 15 rows)
  const startIndex = (currentPage - 1) * pagination.limit;
  const endIndex = startIndex + pagination.limit;
  const paginatedEntries = allEntries.slice(startIndex, endIndex);

  const columnMapping = {
    entryDate: { key: "entry_date", label: "Date", sortable: true },
    wakeupTime: { key: "wakeup_time", label: "Wake Up", sortable: true },
    mangalaAarti: {
      key: "mangala_aarti",
      label: "Mangala Aarti",
      sortable: false,
    },
    morningKatha: {
      key: "morning_katha",
      label: "Morning Katha",
      sortable: false,
    },
    pujaTime: { key: "morning_puja_time", label: "Puja Time", sortable: true },
    vachanamrut: {
      key: "vachanamrut_read",
      label: "Vachanamrut",
      sortable: false,
    },
    meditation: {
      key: "meditation_watch_time",
      label: "Meditation",
      sortable: false,
    },
    cheshta: { key: "cheshta", label: "Cheshta", sortable: false },
    mansiPuja: { key: "mansi_puja_count", label: "Mansi Puja", sortable: true },
    readingTime: { key: "reading_time", label: "Reading", sortable: true },
    wastedTime: { key: "wasted_time", label: "Wasted", sortable: true },
    mantraJap: { key: "mantra_jap", label: "Mantra Jap", sortable: true },
    poshakLeader: {
      key: "poshak_leader",
      label: "Poshak Leader",
      sortable: false,
    },
    notes: { key: "notes", label: "Notes", sortable: false },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading report...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden w-full mt-16">
      <div className="bg-white shadow-sm border-b p-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-xl font-bold text-gray-900">My Report</h3>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Student Selector for Monitors */}
            {user?.is_monitor && assignedStudents.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Student:
                </label>
                <select
                  value={selectedStudentId || ""}
                  onChange={(e) => {
                    setSelectedStudentId(e.target.value || null);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">My Report</option>
                  {assignedStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.first_name} {student.last_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Filters */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">From:</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">To:</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              />
            </div>

            {/* Export to Excel Button */}
            <button
              onClick={handleExportToExcel}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm flex items-center gap-2"
            >
              <FaFileExcel />
              Export to Excel
            </button>

            {/* Column Picker */}
            <div className="relative column-picker">
              <button
                onClick={() => setShowColumnPicker(!showColumnPicker)}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-sm border"
              >
                Columns
              </button>
              {showColumnPicker && (
                <div className="absolute sm:right-0 lg:right-0 md:right-0 top-8 bg-white border rounded-md shadow-lg p-3 z-50 min-w-48">
                  <div className="text-sm font-medium mb-2">
                    Column Settings
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {columnOrder
                      .filter((key) => {
                        // Hide poshak leader option for students and monitors
                        if (key === "poshakLeader") {
                          return (
                            user?.role === "admin" ||
                            user?.role === "poshak_leader"
                          );
                        }
                        return true;
                      })
                      .map((key) => {
                        const originalIndex = columnOrder.indexOf(key);
                        const labels = {
                          entryDate: "Date",
                          wakeupTime: "Wake Up Time",
                          mangalaAarti: "Mangala Aarti",
                          morningKatha: "Morning Katha",
                          pujaTime: "Puja Time",
                          vachanamrut: "Vachanamrut",
                          meditation: "Meditation",
                          cheshta: "Cheshta",
                          mansiPuja: "Mansi Puja",
                          readingTime: "Reading Time",
                          wastedTime: "Wasted Time",
                          mantraJap: "Mantra Jap",
                          poshakLeader: "Poshak Leader",
                          notes: "Notes",
                        };
                        return (
                          <div
                            key={key}
                            className="flex items-center gap-2 py-1 text-sm border-b border-gray-100"
                          >
                            <input
                              type="checkbox"
                              checked={visibleColumns[key]}
                              onChange={(e) => {
                                const newVisible = {
                                  ...visibleColumns,
                                  [key]: e.target.checked,
                                };
                                setVisibleColumns(newVisible);
                                saveUserSettings(columnOrder, newVisible);
                              }}
                            />
                            <div className="flex items-center gap-1 flex-1">
                              <button
                                onClick={() => {
                                  if (originalIndex > 0) {
                                    const newOrder = [...columnOrder];
                                    [
                                      newOrder[originalIndex],
                                      newOrder[originalIndex - 1],
                                    ] = [
                                      newOrder[originalIndex - 1],
                                      newOrder[originalIndex],
                                    ];
                                    setColumnOrder(newOrder);
                                    saveUserSettings(newOrder, visibleColumns);
                                  }
                                }}
                                disabled={originalIndex === 0}
                                className="text-xs px-1 py-0.5 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
                              >
                                ↑
                              </button>
                              <button
                                onClick={() => {
                                  if (originalIndex < columnOrder.length - 1) {
                                    const newOrder = [...columnOrder];
                                    [
                                      newOrder[originalIndex],
                                      newOrder[originalIndex + 1],
                                    ] = [
                                      newOrder[originalIndex + 1],
                                      newOrder[originalIndex],
                                    ];
                                    setColumnOrder(newOrder);
                                    saveUserSettings(newOrder, visibleColumns);
                                  }
                                }}
                                disabled={
                                  originalIndex === columnOrder.length - 1
                                }
                                className="text-xs px-1 py-0.5 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
                              >
                                ↓
                              </button>
                              <span className="flex-1">{labels[key]}</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 h-full">
          <div className="h-full overflow-auto bg-white rounded-lg shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              {/* Sticky Header */}
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  {columnOrder
                    .filter((key) => visibleColumns[key])
                    .filter((key) => {
                      // Hide poshak leader column for students and monitors
                      if (key === "poshakLeader") {
                        return (
                          user?.role === "admin" ||
                          user?.role === "poshak_leader"
                        );
                      }
                      return true;
                    })
                    .map((key) => {
                      const config = columnMapping[key];
                      return (
                        <th
                          key={key}
                          className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                            config.sortable
                              ? "cursor-pointer hover:bg-gray-100"
                              : ""
                          }`}
                          onClick={
                            config.sortable
                              ? () => handleSort(config.key)
                              : undefined
                          }
                        >
                          <div className="flex items-center">
                            {config.label}
                            {config.sortable &&
                              sortConfig.key === config.key && (
                                <span className="ml-1">
                                  {sortConfig.direction === "asc" ? "↑" : "↓"}
                                </span>
                              )}
                          </div>
                        </th>
                      );
                    })}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    onClick={() => handleRowClick(entry)}
                    className={`cursor-pointer hover:bg-gray-50 ${
                      entry.isMissing ? "bg-red-50 hover:bg-red-100" : ""
                    }`}
                  >
                    {columnOrder
                      .filter((key) => visibleColumns[key])
                      .filter((key) => {
                        // Hide poshak leader column for students and monitors
                        if (key === "poshakLeader") {
                          return (
                            user?.role === "admin" ||
                            user?.role === "poshak_leader"
                          );
                        }
                        return true;
                      })
                      .map((key) => {
                        const renderCell = () => {
                          if (entry.isMissing) {
                            return <span className="text-red-500">-</span>;
                          }

                          const getWakeupTimeClass = (timeStr) => {
                            if (!timeStr) return "bg-gray-100 text-gray-800";
                            const [hours, minutes] = timeStr.split(":");
                            const totalMinutes =
                              parseInt(hours) * 60 + parseInt(minutes);
                            const sixAM = 6 * 60;
                            const sixFortyFiveAM = 6 * 60 + 45;
                            if (totalMinutes <= sixAM)
                              return "bg-green-100 text-green-800";
                            if (totalMinutes < sixFortyFiveAM)
                              return "bg-yellow-100 text-yellow-800";
                            return "bg-red-100 text-red-800";
                          };

                          const getDurationClass = (timeStr, type) => {
                            if (!timeStr) return "bg-gray-100 text-gray-800";
                            const [hours, minutes] = timeStr.split(":");
                            const totalMinutes =
                              parseInt(hours) * 60 + parseInt(minutes);
                            if (type === "puja") {
                              if (totalMinutes >= 30)
                                return "bg-green-100 text-green-800";
                              if (totalMinutes >= 15)
                                return "bg-yellow-100 text-yellow-800";
                              return "bg-red-100 text-red-800";
                            }
                            if (type === "reading") {
                              if (totalMinutes >= 60)
                                return "bg-green-100 text-green-800";
                              if (totalMinutes >= 30)
                                return "bg-yellow-100 text-yellow-800";
                              return "bg-red-100 text-red-800";
                            }
                            if (type === "wasted") {
                              if (totalMinutes === 0)
                                return "bg-green-100 text-green-800";
                              if (totalMinutes <= 30)
                                return "bg-yellow-100 text-yellow-800";
                              return "bg-red-100 text-red-800";
                            }
                            return "bg-gray-100 text-gray-800";
                          };

                          const getMeditationWatchTimeClass = (minutes) => {
                            if (minutes >= 15) return "bg-green-100 text-green-800"; // Best
                            if (minutes >= 1 && minutes <= 14) return "bg-yellow-100 text-yellow-800"; // Good
                            return "bg-red-100 text-red-800"; // Worst (0)
                          };

                          switch (key) {
                            case "entryDate":
                              return new Date(
                                entry.entry_date
                              ).toLocaleDateString();
                            case "wakeupTime":
                              return (
                                <span
                                  className={`px-1 py-0.5 rounded text-xs ${getWakeupTimeClass(
                                    entry.wakeup_time
                                  )}`}
                                >
                                  {formatTime(entry.wakeup_time)}
                                </span>
                              );
                            case "mangalaAarti":
                              return (
                                <span
                                  className={`px-2 py-1 rounded-full text-xs ${
                                    entry.mangala_aarti
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {entry.mangala_aarti ? "Yes" : "No"}
                                </span>
                              );
                            case "morningKatha":
                              return (
                                <span
                                  className={`px-1 py-0.5 rounded text-xs ${
                                    entry.morning_katha === "zoom"
                                      ? "bg-green-100 text-green-800"
                                      : entry.morning_katha === "youtube"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {entry.morning_katha === "zoom"
                                    ? "Zoom"
                                    : entry.morning_katha === "youtube"
                                    ? "YouTube"
                                    : "No"}
                                </span>
                              );
                            case "pujaTime":
                              return (
                                <span
                                  className={`px-1 py-0.5 rounded text-xs ${getDurationClass(
                                    entry.morning_puja_time,
                                    "puja"
                                  )}`}
                                >
                                  {formatDuration(entry.morning_puja_time)}
                                </span>
                              );
                            case "vachanamrut":
                              return (
                                <span
                                  className={`px-2 py-1 rounded-full text-xs ${
                                    entry.vachanamrut_read
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {entry.vachanamrut_read ? "Yes" : "No"}
                                </span>
                              );
                            case "meditation":
                              const meditationMinutes = entry.meditation_watch_time || 0;
                              // Handle old entries: if mast_meditation is true but meditation_watch_time is 0
                              const isOldEntry = entry.mast_meditation && meditationMinutes === 0;
                              
                              return (
                                <span
                                  className={`px-2 py-1 rounded-full text-xs ${
                                    isOldEntry
                                      ? "bg-green-100 text-green-800"
                                      : getMeditationWatchTimeClass(meditationMinutes)
                                  }`}
                                >
                                  {isOldEntry
                                    ? "Yes"
                                    : meditationMinutes > 0
                                    ? `${meditationMinutes} min`
                                    : "No"}
                                </span>
                              );
                            case "cheshta":
                              return (
                                <span
                                  className={`px-2 py-1 rounded-full text-xs ${
                                    entry.cheshta
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {entry.cheshta ? "Yes" : "No"}
                                </span>
                              );
                            case "mansiPuja":
                              return (
                                <span
                                  className={`px-1 py-0.5 rounded text-xs ${
                                    entry.mansi_puja_count === 5
                                      ? "bg-green-100 text-green-800"
                                      : entry.mansi_puja_count >= 3
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {entry.mansi_puja_count || "0"}
                                </span>
                              );
                            case "readingTime":
                              return (
                                <span
                                  className={`px-1 py-0.5 rounded text-xs ${getDurationClass(
                                    entry.reading_time,
                                    "reading"
                                  )}`}
                                >
                                  {formatDuration(entry.reading_time)}
                                </span>
                              );
                            case "wastedTime":
                              return (
                                <span
                                  className={`px-1 py-0.5 rounded text-xs ${getDurationClass(
                                    entry.wasted_time,
                                    "wasted"
                                  )}`}
                                >
                                  {formatDuration(entry.wasted_time)}
                                </span>
                              );
                            case "mantraJap":
                              return (
                                <span className="px-1 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                                  {entry.mantra_jap || "0"}
                                </span>
                              );
                            case "poshakLeader":
                              return entry.poshak_first_name
                                ? `${entry.poshak_first_name} ${entry.poshak_last_name}`
                                : "-";
                            case "notes":
                              return (
                                <div className="truncate" title={entry.notes}>
                                  {entry.notes || "-"}
                                </div>
                              );
                            default:
                              return "-";
                          }
                        };

                        if (entry.isMissing && key === "entryDate") {
                          return (
                            <td
                              key={key}
                              className="px-4 py-3 whitespace-nowrap text-sm"
                            >
                              <div className="text-red-600 font-medium">
                                {new Date(
                                  entry.entry_date
                                ).toLocaleDateString()}
                                <div className="text-xs text-red-500">
                                  Missing Details
                                </div>
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td
                            key={key}
                            className={`px-4 py-3 whitespace-nowrap text-sm ${
                              key === "notes" ? "max-w-xs" : ""
                            }`}
                          >
                            {renderCell()}
                          </td>
                        );
                      })}
                  </tr>
                ))}

                {/* Summary Row */}
                {summary && (
                  <tr className="bg-blue-50 border-t-2 border-blue-200 font-semibold">
                    {columnOrder
                      .filter((key) => visibleColumns[key])
                      .map((key) => {
                        if (key === "entryDate") {
                          return (
                            <td key={key} className="px-4 py-3 whitespace-nowrap text-sm text-blue-900">
                              Summary ({summary.count} {summary.count === 1 ? 'day' : 'days'})
                            </td>
                          );
                        } else if (key === "wakeupTime") {
                          return (
                            <td key={key} className="px-4 py-3 whitespace-nowrap text-sm text-blue-900">
                              {formatTime(summary.avgWakeupTime)}
                            </td>
                          );
                        } else if (key === "mangalaAarti") {
                          return (
                            <td key={key} className="px-4 py-3 whitespace-nowrap text-sm text-blue-900">
                              {summary.mangalaAartiCount} / {summary.count}
                            </td>
                          );
                        } else if (key === "morningKatha") {
                          return (
                            <td key={key} className="px-4 py-3 whitespace-nowrap text-sm text-blue-900">
                              <div className="text-xs">
                                <div>Z: {summary.kathaZoom}</div>
                                <div>Y: {summary.kathaYoutube}</div>
                                <div>M: {summary.kathaMissed}</div>
                              </div>
                            </td>
                          );
                        } else if (key === "pujaTime") {
                          const hours = Math.floor(summary.avgPujaMinutes / 60);
                          const minutes = summary.avgPujaMinutes % 60;
                          return (
                            <td key={key} className="px-4 py-3 whitespace-nowrap text-sm text-blue-900">
                              {hours > 0 ? `${hours} h ` : ''}{minutes} m
                            </td>
                          );
                        } else if (key === "vachanamrut") {
                          return (
                            <td key={key} className="px-4 py-3 whitespace-nowrap text-sm text-blue-900">
                              {summary.vachanamrutCount} / {summary.count}
                            </td>
                          );
                        } else if (key === "meditation") {
                          const hours = Math.floor(summary.meditationSum / 60);
                          const minutes = summary.meditationSum % 60;
                          return (
                            <td key={key} className="px-4 py-3 whitespace-nowrap text-sm text-blue-900">
                              {hours > 0 ? `${hours} h ` : ''}{minutes} m
                            </td>
                          );
                        } else if (key === "cheshta") {
                          return (
                            <td key={key} className="px-4 py-3 whitespace-nowrap text-sm text-blue-900">
                              {summary.cheshtaCount} / {summary.count}
                            </td>
                          );
                        } else if (key === "mansiPuja") {
                          return (
                            <td key={key} className="px-4 py-3 whitespace-nowrap text-sm text-blue-900">
                              {summary.mansiPujaSum} / {summary.mansiPujaMax}
                            </td>
                          );
                        } else if (key === "readingTime") {
                          const hours = Math.floor(summary.readingSum / 60);
                          const minutes = summary.readingSum % 60;
                          return (
                            <td key={key} className="px-4 py-3 whitespace-nowrap text-sm text-blue-900">
                              {hours > 0 ? `${hours} h ` : ''}{minutes} m
                            </td>
                          );
                        } else if (key === "wastedTime") {
                          const hours = Math.floor(summary.wastedSum / 60);
                          const minutes = summary.wastedSum % 60;
                          return (
                            <td key={key} className="px-4 py-3 whitespace-nowrap text-sm text-blue-900">
                              {hours > 0 ? `${hours} h ` : ''}{minutes} m
                            </td>
                          );
                        } else if (key === "mantraJap") {
                          return (
                            <td key={key} className="px-4 py-3 whitespace-nowrap text-sm text-blue-900">
                              {summary.mantraJapSum}
                            </td>
                          );
                        } else {
                          return (
                            <td key={key} className="px-4 py-3 whitespace-nowrap text-sm text-blue-900">
                              -
                            </td>
                          );
                        }
                      })}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div className="bg-white border-t flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            {(pagination.page - 1) * pagination.limit + 1}-
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} entries
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={!pagination.hasPrev}
              className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              ◀️
            </button>

            <span className="text-sm text-gray-700">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((prev) => prev + 1)}
              disabled={!pagination.hasNext}
              className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              ▶️
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPage;
