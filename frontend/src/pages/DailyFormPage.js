import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { accountability, assignments } from "../utils/api";
import { useToast } from "../contexts/ToastContext";
import ShareModal from "../components/ShareModal";

const DailyFormPage = ({ user }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { entryData, readOnly, targetDate, targetUserId } =
    location.state || {};
  
  // Determine if form should be readonly based on user role and context
  // Admin and monitors viewing other users' forms should always have readonly access
  const isReadOnly = readOnly || 
    user?.role === 'admin' || 
    (targetUserId && targetUserId !== user?.id);
  
  const [showShareModal, setShowShareModal] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  
  // Helper function to parse time duration (HH:MM) to hours and minutes
  const parseTimeDuration = (timeStr) => {
    if (!timeStr) return { hours: 0, minutes: 0 };
    const [hours, minutes] = timeStr
      .split(":")
      .map((num) => parseInt(num) || 0);
    return { hours: hours || 0, minutes: minutes || 0 };
  };

  // Helper function to format hours and minutes to HH:MM
  const formatTimeDuration = (hours, minutes) => {
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  };

  const [formData, setFormData] = useState(() => {
    let initialDate = new Date().toISOString().split("T")[0];
    if (entryData?.entry_date) {
      initialDate = entryData?.entry_date;
    } else if (targetDate) {
      initialDate = targetDate;
    }

    const morningPujaDuration = parseTimeDuration(entryData?.morning_puja_time);
    const readingDuration = parseTimeDuration(entryData?.reading_time);
    const wastedDuration = parseTimeDuration(entryData?.wasted_time);

    return {
      entryDate: initialDate,
      wakeupTime: entryData?.wakeup_time || "",
      mangalaAarti: entryData?.mangala_aarti || false,
      morningKatha: entryData?.morning_katha || "no",
      morningPujaMinutes:
        morningPujaDuration.hours * 60 + morningPujaDuration.minutes || "",
      meditationWatchTime: entryData?.meditation_watch_time || "",
      vachanamrutRead: entryData?.vachanamrut_read || false,
      mastMeditation: entryData?.mast_meditation || false,
      cheshta: entryData?.cheshta || false,
      mansiPujaCount: entryData?.mansi_puja_count || 0,
      readingHours: readingDuration.hours || "",
      readingMinutes: readingDuration.minutes || "",
      wastedHours: wastedDuration.hours || "",
      wastedMinutes: wastedDuration.minutes || "",
      mantraJap: entryData?.mantra_jap || 0,
      notes: entryData?.notes || "",
    };
  });
  const [loading, setLoading] = useState(false);
  const [assignedStudents, setAssignedStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(() => {
    return targetUserId || user?.id;
  });

  // Separate state for tracking when to fetch existing entry
  const [currentEntryDate, setCurrentEntryDate] = useState(() => {
    if (entryData?.entry_date) {
      return entryData.entry_date;
    } else if (targetDate) {
      return targetDate;
    }
    return new Date().toISOString().split("T")[0];
  });

  useEffect(() => {
    fetchAssignedStudents();
  }, []);

  useEffect(() => {
    if (!entryData && currentEntryDate && selectedStudentId) {
      fetchExistingEntry();
    }
  }, [currentEntryDate, selectedStudentId, entryData]);

  const fetchAssignedStudents = async () => {
    if (user?.is_monitor) {
      try {
        const response = await assignments.getAssignedStudents(user.id);
        setAssignedStudents(response.data);
      } catch (error) {}
    }
  };

  const fetchExistingEntry = async () => {
    try {
      const queryUserId = selectedStudentId;
      const response = await accountability.list({
        date: currentEntryDate,
        userId: queryUserId,
      });
      if (response.data.length > 0) {
        const entry = response.data[0];
        const morningPujaDuration = parseTimeDuration(entry.morning_puja_time);
        const readingDuration = parseTimeDuration(entry.reading_time);
        const wastedDuration = parseTimeDuration(entry.wasted_time);

        setFormData({
          entryDate: currentEntryDate,
          wakeupTime: entry.wakeup_time || "",
          mangalaAarti: entry.mangala_aarti || false,
          morningKatha: entry.morning_katha || "no",
          morningPujaMinutes:
            morningPujaDuration.hours * 60 + morningPujaDuration.minutes || "",
          meditationWatchTime: entry.meditation_watch_time || "",
          vachanamrutRead: entry.vachanamrut_read || false,
          mastMeditation: entry.mast_meditation || false,
          cheshta: entry.cheshta || false,
          mansiPujaCount: entry.mansi_puja_count || 0,
          readingHours: readingDuration.hours || "",
          readingMinutes: readingDuration.minutes || "",
          wastedHours: wastedDuration.hours || "",
          wastedMinutes: wastedDuration.minutes || "",
          mantraJap: entry.mantra_jap || 0,
          notes: entry.notes || "",
        });
      } else {
        setFormData({
          entryDate: currentEntryDate,
          wakeupTime: "",
          mangalaAarti: false,
          morningKatha: "no",
          morningPujaMinutes: "",
          meditationWatchTime: "",
          vachanamrutRead: false,
          mastMeditation: false,
          cheshta: false,
          mansiPujaCount: 0,
          readingHours: "",
          readingMinutes: "",
          wastedHours: "",
          wastedMinutes: "",
          mantraJap: 0,
          notes: "",
        });
      }
    } catch (error) {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Auto-set mastMeditation based on meditationWatchTime
      const meditationMinutes = parseInt(formData.meditationWatchTime) || 0;
      const mastMeditationValue = meditationMinutes >= 1;

      // Convert duration format back to time format for backend
      const submitData = {
        ...formData,
        userId: selectedStudentId,
        meditationWatchTime: meditationMinutes,
        mastMeditation: mastMeditationValue,
        morningPujaTime: formatTimeDuration(
          Math.floor((formData.morningPujaMinutes || 0) / 60),
          (formData.morningPujaMinutes || 0) % 60
        ),
        readingTime: formatTimeDuration(
          formData.readingHours || 0,
          formData.readingMinutes || 0
        ),
        wastedTime: formatTimeDuration(
          formData.wastedHours || 0,
          formData.wastedMinutes || 0
        ),
      };

      // Remove the separate minute field
      delete submitData.morningPujaMinutes;
      delete submitData.readingHours;
      delete submitData.readingMinutes;
      delete submitData.wastedHours;
      delete submitData.wastedMinutes;

      await accountability.create(submitData);
      showSuccess("Entry saved successfully!");
      
      // Store the submitted data for sharing
      setSubmittedData(submitData);
      
      // Show share modal only if user is filling their own form
      if (selectedStudentId === user?.id) {
        setShowShareModal(true);
      } else {
        // If filling for another user, navigate directly
        setTimeout(() => {
          navigate("/dashboard");
        }, 1000);
      }
    } catch (error) {
      showError(error.response?.data?.error || "Failed to save entry");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (!submittedData) return;

    const formatTime = (timeStr) => {
      if (!timeStr) return "-";
      return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    };

    const formatDuration = (timeStr) => {
      if (!timeStr) return "0 minutes";
      const [hours, minutes] = timeStr.split(":");
      const h = parseInt(hours);
      const m = parseInt(minutes);
      if (h === 0 && m === 0) return "0 minutes";
      if (h === 0) return `${m} minutes`;
      if (m === 0) return `${h} hour${h > 1 ? 's' : ''}`;
      return `${h} hour${h > 1 ? 's' : ''} ${m} minutes`;
    };

    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-GB");
    };

    const getYesNo = (value) => (value ? "Yes" : "No");

    const getKathaValue = (value) => {
      if (value === "zoom") return "Zoom";
      if (value === "youtube") return "YouTube";
      return "No";
    };

    // Create the message
    const message = `🫂 ધામભાવે અખંડ સ્મરણ વર્ષ ના જય સ્વામિનારાયણ 🫂

Daily Report

Date: ${formatDate(submittedData.entryDate)}

Wake up time: ${formatTime(submittedData.wakeupTime)}

Mangala Aarti: ${getYesNo(submittedData.mangalaAarti)}

Morning Katha: ${getKathaValue(submittedData.morningKatha)}

Morning Puja: ${formatDuration(submittedData.morningPujaTime)}

Meditation: ${submittedData.meditationWatchTime > 0 ? `${submittedData.meditationWatchTime} minutes` : 'No'}

Vachanamrut: ${getYesNo(submittedData.vachanamrutRead)}

Cheshta: ${getYesNo(submittedData.cheshta)}

Mansi Puja: ${submittedData.mansiPujaCount}

Reading Time: ${formatDuration(submittedData.readingTime)}

Wasted Time: ${formatDuration(submittedData.wastedTime)}

Mantra Jap: ${submittedData.mantraJap || 0}
${submittedData.notes ? `\nNotes: ${submittedData.notes}` : ''}`;

    // Use Web Share API if available
    if (navigator.share) {
      navigator.share({
        title: 'Daily Accountability Report',
        text: message,
      }).then(() => {
        setShowShareModal(false);
        navigate("/dashboard");
      }).catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
        setShowShareModal(false);
        navigate("/dashboard");
      });
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(message).then(() => {
        showSuccess("Report copied to clipboard!");
        setShowShareModal(false);
        navigate("/dashboard");
      }).catch(() => {
        showError("Failed to copy report");
        setShowShareModal(false);
        navigate("/dashboard");
      });
    }
  };

  const handleNotNow = () => {
    setShowShareModal(false);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 mt-16">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-6">
            {isReadOnly ? "View Daily Entry" : "Daily Accountability Form"}
            {entryData && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                ({entryData.first_name} {entryData.last_name} -{" "}
                {formData.entryDate})
              </span>
            )}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <style>
              {isReadOnly &&
                `
                input, select, textarea {
                  background-color: #f9fafb !important;
                  pointer-events: none;
                }
                input[type="checkbox"] {
                  pointer-events: none;
                }
              `}
            </style>

            {/* Student Selection for Monitors */}
            {user?.is_monitor && assignedStudents.length > 0 && !isReadOnly && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fill Form For
                </label>
                <select
                  value={selectedStudentId || ""}
                  onChange={(e) => {
                    const newSelectedId = e.target.value || user.id;
                    setSelectedStudentId(newSelectedId);
                    // Reset form data when switching students
                    setFormData({
                      ...formData,
                      wakeupTime: "",
                      mangalaAarti: false,
                      morningKatha: "no",
                      morningPujaMinutes: "",
                      meditationWatchTime: "",
                      vachanamrutRead: false,
                      mastMeditation: false,
                      cheshta: false,
                      mansiPujaCount: 0,
                      readingHours: "",
                      readingMinutes: "",
                      wastedHours: "",
                      wastedMinutes: "",
                      mantraJap: 0,
                      notes: "",
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={user.id}>
                    Myself ({user.firstName} {user.lastName})
                  </option>
                  {assignedStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.first_name} {student.last_name} - Room{" "}
                      {student.room_number}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                required
                disabled={isReadOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                value={formData.entryDate}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setFormData({ ...formData, entryDate: newDate });
                  setCurrentEntryDate(newDate);
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Wake up time
              </label>
              <input
                type="time"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.wakeupTime}
                onChange={(e) =>
                  setFormData({ ...formData, wakeupTime: e.target.value })
                }
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="mangalaAarti"
                checked={formData.mangalaAarti}
                onChange={(e) =>
                  setFormData({ ...formData, mangalaAarti: e.target.checked })
                }
                className="mr-2"
              />
              <label
                htmlFor="mangalaAarti"
                className="text-sm font-medium text-gray-700"
              >
                Attended Mangala Aarti
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Attended Morning Katha
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.morningKatha}
                onChange={(e) =>
                  setFormData({ ...formData, morningKatha: e.target.value })
                }
              >
                <option value="no">No</option>
                <option value="youtube">YouTube</option>
                <option value="zoom">Zoom</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time spent in Morning Puja (Minutes)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                disabled={isReadOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.morningPujaMinutes}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  if (inputValue === "") {
                    setFormData({
                      ...formData,
                      morningPujaMinutes: "",
                    });
                  } else {
                    const value = parseInt(inputValue);
                    if (!isNaN(value) && value >= 0 && value <= 60) {
                      setFormData({
                        ...formData,
                        morningPujaMinutes: value,
                      });
                    }
                  }
                }}
                placeholder="0-60 minutes"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meditation Watch Time (Minutes)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                disabled={isReadOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.meditationWatchTime}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  if (inputValue === "") {
                    setFormData({
                      ...formData,
                      meditationWatchTime: "",
                    });
                  } else {
                    const value = parseInt(inputValue);
                    if (!isNaN(value) && value >= 0 && value <= 60) {
                      setFormData({
                        ...formData,
                        meditationWatchTime: value,
                      });
                    }
                  }
                }}
                placeholder="0-60 minutes"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="vachanamrutRead"
                checked={formData.vachanamrutRead}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    vachanamrutRead: e.target.checked,
                  })
                }
                className="mr-2"
              />
              <label
                htmlFor="vachanamrutRead"
                className="text-sm font-medium text-gray-700"
              >
                Read Vachanamrut
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="cheshta"
                checked={formData.cheshta}
                onChange={(e) =>
                  setFormData({ ...formData, cheshta: e.target.checked })
                }
                className="mr-2"
              />
              <label
                htmlFor="cheshta"
                className="text-sm font-medium text-gray-700"
              >
                Watched Chesta
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mansi Puja Count (0-5)
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.mansiPujaCount}
                disabled={isReadOnly}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    mansiPujaCount: parseInt(e.target.value),
                  })
                }
              >
                <option value="0">0</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Reading Time (Duration)
              </label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">
                    Hours (0-10)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.readingHours}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      if (inputValue === "") {
                        setFormData({
                          ...formData,
                          readingHours: "",
                        });
                      } else {
                        const value = parseInt(inputValue);
                        if (!isNaN(value) && value >= 0 && value <= 10) {
                          setFormData({
                            ...formData,
                            readingHours: value,
                          });
                        }
                      }
                    }}
                    placeholder="0-10"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">
                    Minutes (0-59)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.readingMinutes}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      if (inputValue === "") {
                        setFormData({
                          ...formData,
                          readingMinutes: "",
                        });
                      } else {
                        const value = parseInt(inputValue);
                        if (!isNaN(value) && value >= 0 && value <= 59) {
                          setFormData({
                            ...formData,
                            readingMinutes: value,
                          });
                        }
                      }
                    }}
                    placeholder="0-59"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Wasted (social/media) - Duration
              </label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">
                    Hours (0-10)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.wastedHours}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      if (inputValue === "") {
                        setFormData({
                          ...formData,
                          wastedHours: "",
                        });
                      } else {
                        const value = parseInt(inputValue);
                        if (!isNaN(value) && value >= 0 && value <= 10) {
                          setFormData({
                            ...formData,
                            wastedHours: value,
                          });
                        }
                      }
                    }}
                    placeholder="0-10"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">
                    Minutes (0-59)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.wastedMinutes}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      if (inputValue === "") {
                        setFormData({
                          ...formData,
                          wastedMinutes: "",
                        });
                      } else {
                        const value = parseInt(inputValue);
                        if (!isNaN(value) && value >= 0 && value <= 59) {
                          setFormData({
                            ...formData,
                            wastedMinutes: value,
                          });
                        }
                      }
                    }}
                    placeholder="0-59"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mantra Jap Count
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.mantraJap === 0 ? "" : formData.mantraJap}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  if (inputValue === "") {
                    setFormData({
                      ...formData,
                      mantraJap: 0,
                    });
                  } else {
                    const value = parseInt(inputValue);
                    if (!isNaN(value) && value >= 0) {
                      setFormData({
                        ...formData,
                        mantraJap: value,
                      });
                    }
                  }
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                maxLength={500}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Any additional notes..."
              />
            </div>

            {!isReadOnly && (
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save Entry"}
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={handleNotNow}
        onShare={handleShare}
        onNotNow={handleNotNow}
        formData={submittedData || {}}
      />
    </div>
  );
};

export default DailyFormPage;
