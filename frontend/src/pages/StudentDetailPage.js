import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { users, profile as profileApi } from "../utils/api";
import { useToast } from "../contexts/ToastContext";
import { useAdminSettings } from "../contexts/AdminSettingsContext";
import { FaChevronDown, FaChevronUp, FaArrowLeft } from "react-icons/fa";

const StudentDetailPage = ({ user }) => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { showError } = useToast();
  const { showInactiveStudents } = useAdminSettings();
  
  const [loading, setLoading] = useState(true);
  const [studentBasicDetails, setStudentBasicDetails] = useState(null);
  const [profileDetails, setProfileDetails] = useState(null);
  
  // Collapsible section states
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    family: false,
    co: false,
    other: false,
  });

  useEffect(() => {
    fetchStudentData();
  }, [studentId]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      
      // Fetch all students (including inactive if admin has toggle on)
      const shouldShowInactive = user?.role === 'admin' && showInactiveStudents;
      const studentsResponse = await users.getStudents(shouldShowInactive);
      const student = studentsResponse.data.find(s => s.id === parseInt(studentId));
      
      if (!student) {
        showError("Student not found");
        navigate("/student-profiles");
        return;
      }

      setStudentBasicDetails({
        firstName: student.first_name || "",
        lastName: student.last_name || "",
        email: student.email || "",
        phone: student.phone || "",
        whatsapp: student.whatsapp || "",
        roomNumber: student.room_number || "",
        isActive: student.is_active,
        poshakName: student.poshak_first_name 
          ? `${student.poshak_first_name} ${student.poshak_last_name}`
          : "Not assigned",
      });

      // Fetch extended profile details
      const profileResponse = await profileApi.get(studentId);
      if (profileResponse.data.profile) {
        setProfileDetails(profileResponse.data.profile);
      }
    } catch (error) {
      showError("Failed to load student data");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format dates from ISO to readable format
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleAdhyatmikReport = () => {
    navigate("/adhyatmik-report", {
      state: {
        selectedStudentId: parseInt(studentId),
        studentName: `${studentBasicDetails.firstName} ${studentBasicDetails.lastName}`,
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading student profile...</div>
      </div>
    );
  }

  if (!studentBasicDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-red-600">Error loading student data</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-24 p-6 bg-white rounded-lg shadow mb-8">
      {/* Back button */}
      <button
        onClick={() => navigate("/student-profiles")}
        className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
      >
        <FaArrowLeft className="mr-2" />
        Back to Student Profiles
      </button>

      {/* Inactive Student Warning Banner */}
      {studentBasicDetails && !studentBasicDetails.isActive && (
        <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
          <div className="flex items-center">
            <span className="text-2xl mr-3">⚠️</span>
            <div>
              <p className="font-bold">Inactive Student</p>
              <p className="text-sm">This student has been deactivated and cannot access the system.</p>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-2xl font-bold mb-2">
        {studentBasicDetails.firstName} {studentBasicDetails.lastName}'s Profile
        {studentBasicDetails && !studentBasicDetails.isActive && (
          <span className="ml-3 px-3 py-1 text-sm bg-red-100 text-red-800 rounded-full">
            Inactive
          </span>
        )}
      </h2>
      <p className="text-gray-600 mb-6">View Only</p>

      {/* Report Buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={handleAdhyatmikReport}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Adhyatmik Report
        </button>
        <button
          disabled
          className="px-4 py-2 bg-gray-300 text-gray-500 rounded cursor-not-allowed"
          title="Education Report - Coming Soon"
        >
          Education Report
        </button>
      </div>

      {/* Basic Details Section */}
      <div className="mb-4 border border-gray-200 rounded-lg">
        <button
          type="button"
          onClick={() => toggleSection("basic")}
          className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg"
        >
          <h3 className="text-xl font-semibold">Basic Details</h3>
          {expandedSections.basic ? <FaChevronUp /> : <FaChevronDown />}
        </button>
        
        {expandedSections.basic && (
          <div className="p-4 space-y-4">
            <div>
              <label className="block font-medium mb-1 text-gray-700">Email</label>
              <input
                type="email"
                value={studentBasicDetails.email}
                disabled
                className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-1 text-gray-700">First Name</label>
                <input
                  type="text"
                  value={studentBasicDetails.firstName}
                  disabled
                  className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block font-medium mb-1 text-gray-700">Last Name</label>
                <input
                  type="text"
                  value={studentBasicDetails.lastName}
                  disabled
                  className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-1 text-gray-700">Phone</label>
                <input
                  type="text"
                  value={studentBasicDetails.phone}
                  disabled
                  className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block font-medium mb-1 text-gray-700">WhatsApp</label>
                <input
                  type="text"
                  value={studentBasicDetails.whatsapp}
                  disabled
                  className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-1 text-gray-700">Room Number</label>
                <input
                  type="text"
                  value={studentBasicDetails.roomNumber || "-"}
                  disabled
                  className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block font-medium mb-1 text-gray-700">Poshak Leader</label>
                <input
                  type="text"
                  value={studentBasicDetails.poshakName}
                  disabled
                  className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Extended Profile Details - Show if available */}
      {profileDetails ? (
        <div className="space-y-4">
          {/* Family Details Section */}
          <div className="border border-gray-200 rounded-lg">
            <button
              type="button"
              onClick={() => toggleSection("family")}
              className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg"
            >
              <h3 className="text-xl font-semibold">Family Details</h3>
              {expandedSections.family ? <FaChevronUp /> : <FaChevronDown />}
            </button>
            
            {expandedSections.family && (
              <div className="p-4 space-y-4">
                <div className="bg-blue-50 p-3 rounded border border-blue-200 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Father's first name is used as student's middle name and mother's middle name.
                  </p>
                </div>

                <h4 className="font-semibold text-lg mt-2 mb-2">Student's Full Name</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-medium mb-1 text-gray-700">First Name</label>
                    <input
                      type="text"
                      value={studentBasicDetails.firstName}
                      disabled
                      className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-gray-700">Middle Name</label>
                    <input
                      type="text"
                      value={profileDetails.middle_name || profileDetails.father_first_name || "-"}
                      disabled
                      className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-gray-700">Last Name</label>
                    <input
                      type="text"
                      value={studentBasicDetails.lastName}
                      disabled
                      className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                </div>

                <h4 className="font-semibold text-lg mt-6 mb-2">Father's Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-1 text-gray-700">Full Name</label>
                    <input
                      type="text"
                      value={`${profileDetails.father_first_name || ""} ${profileDetails.father_middle_name || ""} ${profileDetails.father_last_name || ""}`.trim() || "-"}
                      disabled
                      className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-gray-700">Mobile Number</label>
                    <input
                      type="text"
                      value={profileDetails.father_mobile || "-"}
                      disabled
                      className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block font-medium mb-1 text-gray-700">Occupation</label>
                    <input
                      type="text"
                      value={profileDetails.father_occupation || "-"}
                      disabled
                      className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                </div>

                <h4 className="font-semibold text-lg mt-6 mb-2">Mother's Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-1 text-gray-700">Full Name</label>
                    <input
                      type="text"
                      value={`${profileDetails.mother_first_name || ""} ${profileDetails.mother_middle_name || ""} ${profileDetails.mother_last_name || ""}`.trim() || "-"}
                      disabled
                      className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-gray-700">Mobile Number</label>
                    <input
                      type="text"
                      value={profileDetails.mother_mobile || "-"}
                      disabled
                      className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                </div>

                <h4 className="font-semibold text-lg mt-6 mb-2">Address Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-1 text-gray-700">Present Village/City</label>
                    <input
                      type="text"
                      value={profileDetails.present_village_city || "-"}
                      disabled
                      className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-gray-700">Native Village/City</label>
                    <input
                      type="text"
                      value={profileDetails.native_village_city || "-"}
                      disabled
                      className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block font-medium mb-1 text-gray-700">Complete Present Address</label>
                    <textarea
                      value={profileDetails.complete_present_address || "-"}
                      disabled
                      rows="3"
                      className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-gray-700">Expense Bearer</label>
                    <input
                      type="text"
                      value={profileDetails.expense_bearer ? (profileDetails.expense_bearer === 'self' ? 'Self' : 'Mandir') : "-"}
                      disabled
                      className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* C/O Details Section */}
          <div className="border border-gray-200 rounded-lg">
            <button
              type="button"
              onClick={() => toggleSection("co")}
              className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg"
            >
              <h3 className="text-xl font-semibold">C/O Details</h3>
              {expandedSections.co ? <FaChevronUp /> : <FaChevronDown />}
            </button>
            
            {expandedSections.co && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-1 text-gray-700">C/O Sant Name</label>
                    <input
                      type="text"
                      value={profileDetails.co_sant_name || "-"}
                      disabled
                      className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-gray-700">C/O Haribhakt Name</label>
                    <input
                      type="text"
                      value={`${profileDetails.co_haribhakt_first_name || ""} ${profileDetails.co_haribhakt_middle_name || ""} ${profileDetails.co_haribhakt_last_name || ""}`.trim() || "-"}
                      disabled
                      className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-gray-700">C/O Haribhakt Mobile</label>
                    <input
                      type="text"
                      value={profileDetails.co_haribhakt_mobile || "-"}
                      disabled
                      className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-gray-700">Sakshi Sant Name</label>
                    <input
                      type="text"
                      value={profileDetails.sakshi_sant_name || "-"}
                      disabled
                      className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Other Details Section */}
          <div className="border border-gray-200 rounded-lg">
            <button
              type="button"
              onClick={() => toggleSection("other")}
              className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg"
            >
              <h3 className="text-xl font-semibold">Other Details</h3>
              {expandedSections.other ? <FaChevronUp /> : <FaChevronDown />}
            </button>
            
            {expandedSections.other && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-1 text-gray-700">SMK Number</label>
                    <input
                      type="text"
                      value={profileDetails.smk_number || "NA"}
                      disabled
                      className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-gray-700">Satsang Day</label>
                    <input
                      type="text"
                      value={formatDate(profileDetails.satsang_day)}
                      disabled
                      className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-gray-700">Date of Birth</label>
                    <input
                      type="text"
                      value={formatDate(profileDetails.date_of_birth)}
                      disabled
                      className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-gray-700">Aadhar Card Number</label>
                    <input
                      type="text"
                      value={profileDetails.aadhar_card_number || "-"}
                      disabled
                      className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-gray-700">Driving License</label>
                    <input
                      type="text"
                      value={
                        profileDetails.driving_license === "no" ? "No" :
                        profileDetails.driving_license === "MCWOG" ? "Motorcycle Without Gear (MCWOG)" :
                        profileDetails.driving_license === "MCWG" ? "Motorcycle With Gear (MCWG)" :
                        profileDetails.driving_license === "4_wheeler" ? "4 Wheeler" : "-"
                      }
                      disabled
                      className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                  {profileDetails.driving_license !== "no" && (
                    <div>
                      <label className="block font-medium mb-1 text-gray-700">Driving License Number</label>
                      <input
                        type="text"
                        value={profileDetails.driving_license_number || "-"}
                        disabled
                        className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block font-medium mb-1 text-gray-700">Blood Group</label>
                    <input
                      type="text"
                      value={profileDetails.blood_group || "-"}
                      disabled
                      className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-gray-700">Health Insurance</label>
                    <input
                      type="text"
                      value={profileDetails.health_insurance ? "Yes" : "No"}
                      disabled
                      className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg p-6 text-center text-gray-500">
          <p>Extended profile details not yet filled by student</p>
        </div>
      )}
    </div>
  );
};

export default StudentDetailPage;

