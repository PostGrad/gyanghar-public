import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { accountability, users, assignments } from "../utils/api";
import { useToast } from "../contexts/ToastContext";
import { useAdminSettings } from "../contexts/AdminSettingsContext";

const DashboardPage = ({ user }) => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { showInactiveStudents } = useAdminSettings();
  const [entries, setEntries] = useState([]);
  const [missingStudents, setMissingStudents] = useState([]);
  const [filteredMissingStudents, setFilteredMissingStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split("T")[0];
  });
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [roomFilter, setRoomFilter] = useState("");
  const [poshakFilter, setPoshakFilter] = useState("");
  const [availableRooms, setAvailableRooms] = useState([]);
  const [availablePoshaks, setAvailablePoshaks] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [showMissingStudents, setShowMissingStudents] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
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
    room: false,
    poshakLeader: false,
    notes: false,
  });
  const [columnOrder, setColumnOrder] = useState([
    "room",
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
  }, []); // Load user settings only once on component mount

  useEffect(() => {
    fetchData();
  }, [selectedDate, showInactiveStudents]); // Re-fetch when date or toggle changes

  const loadUserSettings = async () => {
    try {
      const settings = await accountability.getUserSettings();
      if (settings.data?.columnOrder) {
        setColumnOrder(settings.data.columnOrder);
      }
      if (settings.data?.visibleColumns) {
        setVisibleColumns((prev) => ({
          ...prev,
          ...settings.data.visibleColumns,
        }));
      }
    } catch (error) {
      showError("Failed to load user settings");
    }
  };

  const saveUserSettings = async (newColumnOrder, newVisibleColumns) => {
    try {
      await accountability.updateUserSettings({
        columnOrder: newColumnOrder,
        visibleColumns: newVisibleColumns,
      });
      showSuccess("Dashboard settings saved");
    } catch (error) {
      showError("Failed to save dashboard settings");
    }
  };

  const toggleMissingStudents = () => {
    setShowMissingStudents(!showMissingStudents);
  };

  const goToPreviousDay = () => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() - 1);
    setSelectedDate(currentDate.toISOString().split("T")[0]);
  };

  const goToNextDay = () => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + 1);
    setSelectedDate(currentDate.toISOString().split("T")[0]);
  };

  const goToToday = () => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
  };

  const getTodayFormatted = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}`;
  };

  const handleSort = (column) => {
    let direction = "asc";
    if (sortConfig.key === column && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key: column, direction });
  };

  useEffect(() => {
    let filtered = entries;

    if (roomFilter) {
      filtered = filtered.filter((entry) => {
        if (roomFilter === "Not Assigned") {
          return !entry.room_number;
        }
        return entry.room_number === roomFilter;
      });
    }

    if (poshakFilter) {
      filtered = filtered.filter((entry) => {
        if (poshakFilter === "Poshak Not Assigned") {
          return !entry.poshak_first_name;
        }
        const poshakName = entry.poshak_first_name
          ? `${entry.poshak_first_name} ${entry.poshak_last_name}`
          : "";
        return poshakName === poshakFilter;
      });
    }

    // Filter missing students with the same criteria
    let filteredMissing = missingStudents;

    if (roomFilter) {
      filteredMissing = filteredMissing.filter((student) => {
        if (roomFilter === "Not Assigned") {
          return !student.room_number;
        }
        return student.room_number === roomFilter;
      });
    }

    if (poshakFilter) {
      filteredMissing = filteredMissing.filter((student) => {
        if (poshakFilter === "Poshak Not Assigned") {
          return !student.poshak_first_name;
        }
        const poshakName = student.poshak_first_name
          ? `${student.poshak_first_name} ${student.poshak_last_name}`
          : "";
        return poshakName === poshakFilter;
      });
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue, bValue;

        switch (sortConfig.key) {
          case "student":
            aValue = `${a.first_name} ${a.last_name}`;
            bValue = `${b.first_name} ${b.last_name}`;
            break;
          case "room":
            aValue = a.room_number || "";
            bValue = b.room_number || "";
            break;
          case "wakeupTime":
            aValue = a.wakeup_time || "";
            bValue = b.wakeup_time || "";
            break;
          case "mangalaAarti":
            aValue = a.mangala_aarti ? 1 : 0;
            bValue = b.mangala_aarti ? 1 : 0;
            break;
          case "morningKatha":
            aValue = a.morning_katha || "";
            bValue = b.morning_katha || "";
            break;
          case "pujaTime":
            aValue = a.morning_puja_time || "";
            bValue = b.morning_puja_time || "";
            break;
          case "vachanamrut":
            aValue = a.vachanamrut_read ? 1 : 0;
            bValue = b.vachanamrut_read ? 1 : 0;
            break;
          case "meditation":
            aValue = a.meditation_watch_time || 0;
            bValue = b.meditation_watch_time || 0;
            break;
          case "cheshta":
            aValue = a.cheshta ? 1 : 0;
            bValue = b.cheshta ? 1 : 0;
            break;
          case "mansiPuja":
            aValue = a.mansi_puja_count || 0;
            bValue = b.mansi_puja_count || 0;
            break;
          case "readingTime":
            aValue = a.reading_time || "";
            bValue = b.reading_time || "";
            break;
          case "wastedTime":
            aValue = a.wasted_time || "";
            bValue = b.wasted_time || "";
            break;
          case "mantraJap":
            aValue = a.mantra_jap || 0;
            bValue = b.mantra_jap || 0;
            break;
          case "poshakLeader":
            aValue = a.poshak_first_name
              ? `${a.poshak_first_name} ${a.poshak_last_name}`
              : "";
            bValue = b.poshak_first_name
              ? `${b.poshak_first_name} ${b.poshak_last_name}`
              : "";
            break;
          case "notes":
            aValue = a.notes || "";
            bValue = b.notes || "";
            break;
          default:
            aValue = a[sortConfig.key] || "";
            bValue = b[sortConfig.key] || "";
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    setFilteredEntries(filtered);
    setFilteredMissingStudents(filteredMissing);
  }, [entries, missingStudents, roomFilter, poshakFilter, sortConfig]);

  const handleRowClick = async (entry) => {
    let canEdit = false;

    // Students can edit their own entries
    if (user?.role === "student" && entry.user_id === user.id) {
      canEdit = true;
    }

    // Monitors can edit entries for their assigned students
    if (user?.is_monitor && entry.user_id !== user.id) {
      try {
        const response = await assignments.getAssignedStudents(user.id);
        const assignedStudentIds = response.data.map((student) => student.id);
        if (assignedStudentIds.includes(entry.user_id)) {
          canEdit = true;
        }
      } catch (error) {}
    }

    // Monitors can also edit their own entries
    if (user?.is_monitor && entry.user_id === user.id) {
      canEdit = true;
    }

    navigate("/daily-form", {
      state: {
        entryData: entry,
        readOnly: !canEdit,
        targetDate: entry.entry_date,
        targetUserId: entry.user_id,
      },
    });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showColumnPicker && !event.target.closest(".column-picker")) {
        setShowColumnPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showColumnPicker]);

  const fetchData = async () => {
    try {
      // Only admin can see inactive students when the global toggle is on
      const shouldShowInactive = user?.role === 'admin' && showInactiveStudents;
      
      const [entriesRes, studentsRes] = await Promise.all([
        accountability.list({ date: selectedDate }),
        users.getStudents(shouldShowInactive),
      ]);
      
      // Filter entries to only show entries from active students (or all if admin toggle is on)
      const filteredEntriesData = shouldShowInactive 
        ? entriesRes.data 
        : entriesRes.data.filter(entry => {
            // Find the student for this entry
            const student = studentsRes.data.find(s => s.id === entry.user_id);
            // Only include if student is found (which means they are active)
            return student !== undefined;
          });
      
      setEntries(filteredEntriesData);
      setFilteredEntries(filteredEntriesData);
      
      // Extract unique rooms and poshaks for filters from all students
      const rooms = [
        ...new Set(
          studentsRes.data.map(
            (student) => student.room_number || "Not Assigned"
          )
        ),
      ];
      const poshaks = [
        ...new Set(
          studentsRes.data.map((student) =>
            student.poshak_first_name
              ? `${student.poshak_first_name} ${student.poshak_last_name}`
              : "Poshak Not Assigned"
          )
        ),
      ];

      setAvailableRooms(rooms.sort());
      setAvailablePoshaks(poshaks.sort());

      const filledStudentIds = filteredEntriesData.map((entry) => entry.user_id);
      const missing = studentsRes.data.filter(
        (student) => !filledStudentIds.includes(student.id)
      );
      setMissingStudents(missing);
    } catch (error) {
      showError("Failed to fetch dashboard data");
    } finally {
      setLoading(false);
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

  const getWakeupTimeClass = (timeStr) => {
    if (!timeStr) return "bg-gray-100 text-gray-800";
    const [hours, minutes] = timeStr.split(":");
    const totalMinutes = parseInt(hours) * 60 + parseInt(minutes);
    const sixAM = 6 * 60;
    const sixFortyFiveAM = 6 * 60 + 45;

    if (totalMinutes <= sixAM) return "bg-green-100 text-green-800";
    if (totalMinutes < sixFortyFiveAM) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getDurationClass = (timeStr, type) => {
    if (!timeStr) return "bg-gray-100 text-gray-800";
    const [hours, minutes] = timeStr.split(":");
    const totalMinutes = parseInt(hours) * 60 + parseInt(minutes);

    if (type === "puja") {
      if (totalMinutes >= 30) return "bg-green-100 text-green-800";
      if (totalMinutes >= 15) return "bg-yellow-100 text-yellow-800";
      return "bg-red-100 text-red-800";
    }

    if (type === "reading") {
      if (totalMinutes >= 60) return "bg-green-100 text-green-800";
      if (totalMinutes >= 30) return "bg-yellow-100 text-yellow-800";
      return "bg-red-100 text-red-800";
    }

    if (type === "wasted") {
      if (totalMinutes === 0) return "bg-green-100 text-green-800";
      if (totalMinutes <= 30) return "bg-yellow-100 text-yellow-800";
      return "bg-red-100 text-red-800";
    }

    return "bg-gray-100 text-gray-800";
  };

  const getMeditationWatchTimeClass = (minutes) => {
    if (minutes >= 15) return "bg-green-100 text-green-800"; // Best
    if (minutes >= 1 && minutes <= 14) return "bg-yellow-100 text-yellow-800"; // Good
    return "bg-red-100 text-red-800"; // Worst (0)
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden w-full">
      {/* Fixed filter and missing students bar below navbar */}
      <div className="fixed top-20 left-0 w-full z-40 bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 w-full">
          <div className="bg-blue-500 rounded-lg shadow-md p-3 sm:p-6 mb-0 flex-shrink-0 w-full">
            <h1 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-4 text-white">
              Daily Report Dashboard
            </h1>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-2">
                  <label className="font-medium text-sm sm:text-base text-white">
                    Date:
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={goToPreviousDay}
                      className="px-2 py-1.5 bg-white hover:bg-blue-50 border border-gray-300 rounded-md transition-all hover:border-blue-400 hover:shadow-md"
                      title="Previous Day"
                    >
                      <svg
                        className="w-4 h-4 text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </button>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-2 py-1.5 border border-gray-300 rounded-md text-sm hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                    <button
                      onClick={goToNextDay}
                      className="px-2 py-1.5 bg-white hover:bg-blue-50 border border-gray-300 rounded-md transition-all hover:border-blue-400 hover:shadow-md"
                      title="Next Day"
                    >
                      <svg
                        className="w-4 h-4 text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={goToToday}
                      className="px-3 py-1.5 bg-white hover:bg-blue-600 border border-gray-300 rounded-md text-sm font-semibold text-gray-700 hover:text-white transition-all hover:border-blue-600 hover:shadow-md flex items-center gap-1.5"
                      title="Go to Today"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      {getTodayFormatted()}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="font-medium text-sm sm:text-base text-white">
                    Room:
                  </label>
                  <select
                    value={roomFilter}
                    onChange={(e) => setRoomFilter(e.target.value)}
                    className="px-1 py-1 border border-gray-300 rounded-md text-sm sm:text-base"
                  >
                    <option value="">All Rooms</option>
                    {availableRooms.map((room) => (
                      <option key={room} value={room}>
                        {room}
                      </option>
                    ))}
                  </select>
                </div>
                {(user?.role === "admin" || user?.role === "poshak_leader") && (
                  <div className="flex items-center gap-2">
                    <label className="font-medium text-sm sm:text-base text-white">
                      Poshak:
                    </label>
                    <select
                      value={poshakFilter}
                      onChange={(e) => setPoshakFilter(e.target.value)}
                      className="px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 rounded-md text-sm sm:text-base"
                    >
                      <option value="">All Poshaks</option>
                      {availablePoshaks.map((poshak) => (
                        <option key={poshak} value={poshak}>
                          {poshak}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="relative column-picker">
                <button
                  onClick={() => setShowColumnPicker(!showColumnPicker)}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-sm border"
                >
                  Columns
                </button>
                {showColumnPicker && (
                  <div className="absolute sm:right-0 lg:right-0 md:right-0 top-8 bg-white border rounded-md shadow-lg p-3 z-10 min-w-48">
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
                            room: "Room",
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
                                      saveUserSettings(
                                        newOrder,
                                        visibleColumns
                                      );
                                    }
                                  }}
                                  disabled={originalIndex === 0}
                                  className="text-xs px-1 py-0.5 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
                                >
                                  ↑
                                </button>
                                <button
                                  onClick={() => {
                                    if (
                                      originalIndex <
                                      columnOrder.length - 1
                                    ) {
                                      const newOrder = [...columnOrder];
                                      [
                                        newOrder[originalIndex],
                                        newOrder[originalIndex + 1],
                                      ] = [
                                        newOrder[originalIndex + 1],
                                        newOrder[originalIndex],
                                      ];
                                      setColumnOrder(newOrder);
                                      saveUserSettings(
                                        newOrder,
                                        visibleColumns
                                      );
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
          {filteredMissingStudents.length > 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 sm:p-4 mt-2 flex-shrink-0 mb">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={toggleMissingStudents}
              >
                <h2 className="text-sm sm:text-lg font-semibold text-yellow-800">
                  Missing Entries ({filteredMissingStudents.length}
                  {(roomFilter || poshakFilter) &&
                    missingStudents.length !== filteredMissingStudents.length &&
                    ` of ${missingStudents.length}`}
                  )
                </h2>
                <span className="text-yellow-800 font-bold text-lg">
                  {showMissingStudents ? "−" : "+"}
                </span>
              </div>
              {showMissingStudents && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-1 sm:gap-2 mt-2 sm:mt-3">
                  {filteredMissingStudents.map((student) => (
                    <div
                      key={student.id}
                      className="bg-white px-2 py-1 rounded border text-xs sm:text-sm truncate"
                      title={`${student.first_name} ${student.last_name}${
                        student.room_number
                          ? ` - Room ${student.room_number}`
                          : ""
                      }`}
                    >
                      {student.first_name} {student.last_name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : missingStudents.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-2 sm:p-4 mt-2 flex-shrink-0 mb">
              <div className="text-sm sm:text-lg font-semibold text-green-800 text-center">
                Great, no missing entries! 🎉
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-4 mt-2 flex-shrink-0 mb">
              <div className="text-sm sm:text-lg font-semibold text-blue-800 text-center">
                No missing entries match the current filters (
                {missingStudents.length} total missing)
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Table area below fixed filter bar */}
      <div className="flex-1 overflow-hidden pt-86">
        <div className="max-w-7xl mx-auto h-full flex flex-col">
          <div className="bg-white rounded-lg shadow-md overflow-hidden flex-1 min-h-0">
            <div className="h-full w-full overflow-auto">
              <div className="w-full min-w-[600px] h-full overflow-x-auto">
                <div
                  style={{
                    maxHeight: "calc(100vh - 220px)",
                    overflowY: "auto",
                  }}
                >
                  <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                    <thead className="bg-gray-50 sticky top-0 z-30">
                      <tr>
                        <th className="px-2 sm:px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-gray-50 sticky top-0 z-30">
                          <div className="break-words">#</div>
                        </th>
                        <th
                          className="px-2 sm:px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 bg-gray-50 sticky top-0 z-30"
                          onClick={() => handleSort("student")}
                        >
                          <div className="break-words flex items-center justify-center gap-1">
                            Student
                            {sortConfig.key === "student" && (
                              <span className="text-blue-500">
                                {sortConfig.direction === "asc" ? "↑" : "↓"}
                              </span>
                            )}
                          </div>
                        </th>
                        {columnOrder
                          .filter((col) => visibleColumns[col])
                          .filter((col) => {
                            // Hide poshak leader column for students and monitors
                            if (col === "poshakLeader") {
                              return (
                                user?.role === "admin" ||
                                user?.role === "poshak_leader"
                              );
                            }
                            return true;
                          })
                          .map((column) => {
                            const labels = {
                              room: "Room",
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
                              <th
                                key={column}
                                className="px-2 sm:px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 bg-gray-50 sticky top-0 z-30"
                                onClick={() => handleSort(column)}
                              >
                                <div className="break-words flex items-center justify-center gap-1">
                                  {labels[column]}
                                  {sortConfig.key === column && (
                                    <span className="text-blue-500">
                                      {sortConfig.direction === "asc"
                                        ? "↑"
                                        : "↓"}
                                    </span>
                                  )}
                                </div>
                              </th>
                            );
                          })}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredEntries.map((entry, index) => (
                        <tr
                          key={entry.id}
                          onClick={() => handleRowClick(entry)}
                          className="cursor-pointer hover:bg-gray-50"
                        >
                          <td className="px-2 sm:px-4 py-2 text-center text-gray-500 font-medium">
                            {index + 1}
                          </td>
                          <td className="px-2 sm:px-4 py-2 text-center font-medium text-gray-900">
                            <div
                              className="truncate max-w-20 sm:max-w-none"
                              title={`${entry.first_name} ${entry.last_name}`}
                            >
                              {entry.first_name} {entry.last_name}
                            </div>
                          </td>
                          {columnOrder
                            .filter((col) => visibleColumns[col])
                            .filter((col) => {
                              // Hide poshak leader column for students and monitors
                              if (col === "poshakLeader") {
                                return (
                                  user?.role === "admin" ||
                                  user?.role === "poshak_leader"
                                );
                              }
                              return true;
                            })
                            .map((column) => {
                              const renderCell = () => {
                                switch (column) {
                                  case "room":
                                    return entry.room_number || "-";
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
                                        className={`px-1 py-0.5 rounded text-xs ${
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
                                        {formatDuration(
                                          entry.morning_puja_time
                                        )}
                                      </span>
                                    );
                                  case "vachanamrut":
                                    return (
                                      <span
                                        className={`px-1 py-0.5 rounded text-xs ${
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
                                        className={`px-1 py-0.5 rounded text-xs ${
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
                                        className={`px-1 py-0.5 rounded text-xs ${
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
                                        {entry.mansi_puja_count}
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
                                        {entry.mantra_jap || 0}
                                      </span>
                                    );
                                  case "poshakLeader":
                                    return entry.poshak_first_name
                                      ? `${entry.poshak_first_name} ${entry.poshak_last_name}`
                                      : "-";
                                  case "notes":
                                    return (
                                      <div
                                        className="truncate"
                                        title={entry.notes}
                                      >
                                        {entry.notes || "-"}
                                      </div>
                                    );
                                  default:
                                    return "-";
                                }
                              };
                              return (
                                <td
                                  key={column}
                                  className={`px-2 sm:px-4 py-2 text-center ${
                                    column === "student"
                                      ? "font-medium text-gray-900"
                                      : "text-gray-500"
                                  } ${
                                    column === "notes"
                                      ? "text-left max-w-32"
                                      : ""
                                  }`}
                                >
                                  {renderCell()}
                                </td>
                              );
                            })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredEntries.length === 0 && entries.length > 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No entries match the selected filters
                  </div>
                )}
                {entries.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No entries found for {selectedDate}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button for Today's Entry - Only for students */}
      {user?.role === "student" && (
        <button
          onClick={() => {
            const today = new Date().toISOString().split("T")[0];
            navigate("/daily-form", {
              state: {
                targetDate: today,
                targetUserId: user?.id,
                readOnly: false,
              },
            });
          }}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-50 group"
          title="Add Today's Entry"
        >
          <svg
            className="w-6 h-6 group-hover:scale-110 transition-transform duration-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

export default DashboardPage;
