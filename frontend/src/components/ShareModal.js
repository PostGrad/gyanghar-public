import React from "react";
import { FaWhatsapp, FaShareAlt } from "react-icons/fa";

const ShareModal = ({ isOpen, onClose, onShare, onNotNow, formData }) => {
  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Entry Saved Successfully!</h2>
            <button
              onClick={onNotNow}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-center text-blue-600 mb-4">
              🫂 ધામભાવે અખંડ સ્મરણ વર્ષ ના જય સ્વામિનારાયણ 🫂
            </h3>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <p className="font-semibold text-center text-gray-700 mb-3">Daily Report</p>
              
              <div className="space-y-1">
                <p><span className="font-medium">Date:</span> {formatDate(formData.entryDate)}</p>
                <p><span className="font-medium">Wake up time:</span> {formatTime(formData.wakeupTime)}</p>
                <p><span className="font-medium">Mangala Aarti:</span> {getYesNo(formData.mangalaAarti)}</p>
                <p><span className="font-medium">Morning Katha:</span> {getKathaValue(formData.morningKatha)}</p>
                <p><span className="font-medium">Morning Puja:</span> {formatDuration(formData.morningPujaTime)}</p>
                <p><span className="font-medium">Meditation:</span> {formData.meditationWatchTime > 0 ? `${formData.meditationWatchTime} minutes` : 'No'}</p>
                <p><span className="font-medium">Vachanamrut:</span> {getYesNo(formData.vachanamrutRead)}</p>
                <p><span className="font-medium">Cheshta:</span> {getYesNo(formData.cheshta)}</p>
                <p><span className="font-medium">Mansi Puja:</span> {formData.mansiPujaCount}</p>
                <p><span className="font-medium">Reading Time:</span> {formatDuration(formData.readingTime)}</p>
                <p><span className="font-medium">Wasted Time:</span> {formatDuration(formData.wastedTime)}</p>
                <p><span className="font-medium">Mantra Jap:</span> {formData.mantraJap || 0}</p>
                {formData.notes && (
                  <p><span className="font-medium">Notes:</span> {formData.notes}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onShare}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <FaShareAlt className="text-lg" />
              Share
            </button>
            <button
              onClick={onNotNow}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;

