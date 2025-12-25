import React, { useState, useEffect } from "react";
import { users, profile as profileApi } from "../utils/api";
import { useToast } from "../contexts/ToastContext";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

const ProfilePage = ({ user }) => {
  const [basicDetails, setBasicDetails] = useState(null);
  const [profileDetails, setProfileDetails] = useState({
    // Family Details
    fatherFirstName: "",
    fatherMiddleName: "",
    fatherLastName: "",
    motherFirstName: "",
    motherMiddleName: "",
    motherLastName: "",
    fatherMobile: "",
    motherMobile: "",
    presentVillageCity: "",
    nativeVillageCity: "",
    completePresentAddress: "",
    fatherOccupation: "",
    expenseBearer: "self",
    // C/O Details
    coSantName: "",
    coHaribhaktFirstName: "",
    coHaribhaktMiddleName: "",
    coHaribhaktLastName: "",
    coHaribhaktMobile: "",
    sakshiSantName: "",
    // Other Details
    smkNumber: "NA",
    satsangDay: "",
    dateOfBirth: "",
    aadharCardNumber: "",
    drivingLicense: "no",
    drivingLicenseNumber: "",
    bloodGroup: "A+",
    healthInsurance: false,
  });

  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [motherMiddleNameManuallyEdited, setMotherMiddleNameManuallyEdited] = useState(false);
  const { showSuccess, showError } = useToast();

  // Collapsible section states
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    family: false,
    co: false,
    other: false,
  });

  const isStudentView = user?.role === "student";

  useEffect(() => {
    fetchUserData();
  }, []);

  // Auto-fill parent's last name when student's last name changes
  useEffect(() => {
    if (basicDetails?.lastName && !profileDetails.fatherLastName) {
      setProfileDetails(prev => ({
        ...prev,
        fatherLastName: basicDetails.lastName,
        motherLastName: basicDetails.lastName,
      }));
    }
  }, [basicDetails?.lastName]);

  // Auto-fill mother's middle name when father's first name changes
  // Father's first name = Student's middle name = Mother's middle name
  // Similar to registration page where WhatsApp auto-fills from mobile number
  useEffect(() => {
    // Only auto-fill if user hasn't manually edited mother's middle name
    if (profileDetails.fatherFirstName && !motherMiddleNameManuallyEdited) {
      setProfileDetails(prev => ({
        ...prev,
        motherMiddleName: profileDetails.fatherFirstName,
      }));
    }
  }, [profileDetails.fatherFirstName, motherMiddleNameManuallyEdited]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const response = await users.getMe();
      const userData = response.data[0];

      if (!userData) {
        throw new Error("No user data found");
      }

      setUserId(userData.id);

      const poshakName =
        userData?.poshakFirstName && userData?.poshakLastName
          ? `${userData.poshakFirstName} ${userData.poshakLastName}`
          : userData?.poshakFirstName ||
            userData?.poshakLastName ||
            "Not assigned";

      setBasicDetails({
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        phone: userData.phone || "",
        whatsapp: userData.whatsapp || "",
        room: userData.roomNumber || "",
        email: userData.email || "",
        poshakName: poshakName,
      });

      // Fetch profile details if student
      if (user?.role === "student") {
        const profileResponse = await profileApi.get(userData.id);
        if (profileResponse.data.profile) {
          const p = profileResponse.data.profile;
          
          // If mother's middle name exists and is different from father's first name,
          // mark it as manually edited
          if (p.mother_middle_name && p.mother_middle_name !== p.father_first_name) {
            setMotherMiddleNameManuallyEdited(true);
          }
          
          // Helper function to convert ISO date string to YYYY-MM-DD format for date input
          const formatDateForInput = (dateStr) => {
            if (!dateStr) return "";
            // Parse the date string and convert to YYYY-MM-DD format (local date only)
            const date = new Date(dateStr);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          };
          
          setProfileDetails({
            fatherFirstName: p.father_first_name || "",
            fatherMiddleName: p.father_middle_name || "",
            fatherLastName: p.father_last_name || "",
            motherFirstName: p.mother_first_name || "",
            motherMiddleName: p.mother_middle_name || "",
            motherLastName: p.mother_last_name || "",
            fatherMobile: p.father_mobile || "",
            motherMobile: p.mother_mobile || "",
            presentVillageCity: p.present_village_city || "",
            nativeVillageCity: p.native_village_city || "",
            completePresentAddress: p.complete_present_address || "",
            fatherOccupation: p.father_occupation || "",
            expenseBearer: p.expense_bearer || "self",
            coSantName: p.co_sant_name || "",
            coHaribhaktFirstName: p.co_haribhakt_first_name || "",
            coHaribhaktMiddleName: p.co_haribhakt_middle_name || "",
            coHaribhaktLastName: p.co_haribhakt_last_name || "",
            coHaribhaktMobile: p.co_haribhakt_mobile || "",
            sakshiSantName: p.sakshi_sant_name || "",
            smkNumber: p.smk_number || "",
            satsangDay: formatDateForInput(p.satsang_day),
            dateOfBirth: formatDateForInput(p.date_of_birth),
            aadharCardNumber: p.aadhar_card_number || "",
            drivingLicense: p.driving_license || "no",
            drivingLicenseNumber: p.driving_license_number || "",
            bloodGroup: p.blood_group || "A+",
            healthInsurance: Boolean(p.health_insurance), // Convert to boolean (MySQL returns 0 or 1)
          });
        }
      }
    } catch (error) {
      showError("Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  const validateProfileField = (name, value) => {
    const errors = { ...validationErrors };

    switch (name) {
      case "fatherMobile":
      case "motherMobile":
      case "coHaribhaktMobile":
        if (value && !/^\d{10}$/.test(value)) {
          errors[name] = "Must be exactly 10 digits";
        } else {
          delete errors[name];
        }
        break;
      case "aadharCardNumber":
        if (value && !/^\d{12}$/.test(value)) {
          errors[name] = "Must be exactly 12 digits";
        } else {
          delete errors[name];
        }
        break;
      case "smkNumber":
        if (value && value !== "NA" && !/^[A-Z]{3}[0-9]{3}$/.test(value)) {
          errors[name] = "Must be 3 uppercase letters followed by 3 digits (e.g., ABC123) or 'NA'";
        } else {
          delete errors[name];
        }
        break;
      default:
        delete errors[name];
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleBasicDetailsChange = (e) => {
    const { name, value } = e.target;
    setBasicDetails({ ...basicDetails, [name]: value });
  };

  const handleProfileDetailsChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;
    
    // Track if mother's middle name is manually edited
    if (name === "motherMiddleName") {
      setMotherMiddleNameManuallyEdited(true);
    }
    
    setProfileDetails({ ...profileDetails, [name]: newValue });
    validateProfileField(name, newValue);
  };

  const handleBasicDetailsSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updateData = {
        firstName: basicDetails.firstName,
        lastName: basicDetails.lastName,
        phone: basicDetails.phone,
        whatsapp: basicDetails.whatsapp,
        roomNumber: basicDetails.room,
      };
      await users.updateProfile(userId, updateData);
      showSuccess("Basic details updated successfully!");
    } catch (error) {
      showError("Failed to update basic details");
    } finally {
      setSaving(false);
    }
  };

  const handleProfileDetailsSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    const requiredFields = [
      "fatherFirstName", "fatherLastName", "motherFirstName", "motherLastName",
      "fatherMobile", "motherMobile", "presentVillageCity", "nativeVillageCity",
      "completePresentAddress", "fatherOccupation", "dateOfBirth", "aadharCardNumber",
      "bloodGroup"
    ];

    let isValid = true;
    requiredFields.forEach(field => {
      if (!profileDetails[field]) {
        isValid = false;
        showError(`${field} is required`);
      }
    });

    if (!isValid) return;

    // Validate driving license number if license type is selected
    if (profileDetails.drivingLicense !== "no" && !profileDetails.drivingLicenseNumber) {
      showError("Driving license number is required when driving license type is selected");
      return;
    }

    setSaving(true);
    try {
      // Set student's middle name to father's first name before saving
      const dataToSave = {
        ...profileDetails,
        middleName: profileDetails.fatherFirstName,
      };
      await profileApi.save(dataToSave);
      showSuccess("Profile details saved successfully!");
    } catch (error) {
      showError(error.response?.data?.error || "Failed to save profile details");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!basicDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-red-600">Error loading profile data</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-24 p-6 bg-white rounded-lg shadow mb-8">
      <h2 className="text-2xl font-bold mb-6">Profile</h2>

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
          <form onSubmit={handleBasicDetailsSubmit} className="p-4 space-y-4">
            <div>
              <label className="block font-medium mb-1">Email *</label>
              <input
                type="email"
                value={basicDetails.email}
                disabled
                className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-1">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={basicDetails.firstName}
                  onChange={handleBasicDetailsChange}
                  disabled={!isStudentView}
                  className={`w-full px-3 py-2 border rounded ${!isStudentView ? 'bg-gray-100' : ''}`}
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={basicDetails.lastName}
                  onChange={handleBasicDetailsChange}
                  disabled={!isStudentView}
                  className={`w-full px-3 py-2 border rounded ${!isStudentView ? 'bg-gray-100' : ''}`}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-1">Phone *</label>
                <input
                  type="text"
                  name="phone"
                  value={basicDetails.phone}
                  onChange={handleBasicDetailsChange}
                  disabled={!isStudentView}
                  placeholder="10 digit number"
                  className={`w-full px-3 py-2 border rounded ${!isStudentView ? 'bg-gray-100' : ''}`}
                />
              </div>
              <div>
                <label className="block font-medium mb-1">WhatsApp *</label>
                <input
                  type="text"
                  name="whatsapp"
                  value={basicDetails.whatsapp}
                  onChange={handleBasicDetailsChange}
                  disabled={!isStudentView}
                  placeholder="10 digit number"
                  className={`w-full px-3 py-2 border rounded ${!isStudentView ? 'bg-gray-100' : ''}`}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-1">Room Number</label>
                <input
                  type="text"
                  name="room"
                  value={basicDetails.room}
                  onChange={handleBasicDetailsChange}
                  disabled={!isStudentView}
                  className={`w-full px-3 py-2 border rounded ${!isStudentView ? 'bg-gray-100' : ''}`}
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Poshak Leader</label>
                <input
                  type="text"
                  value={basicDetails.poshakName}
                  disabled
                  className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                />
              </div>
            </div>
            {isStudentView && (
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={saving}
              >
                {saving ? "Saving..." : "Update Basic Details"}
              </button>
            )}
          </form>
        )}
      </div>

      {/* Extended Profile Details for Students Only */}
      {user?.role === "student" && (
        <form onSubmit={handleProfileDetailsSubmit} className="space-y-4">
          
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

                <h4 className="font-semibold text-lg mt-2 mb-2">Father's Full Name *</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-medium mb-1">First Name *</label>
                    <input
                      type="text"
                      name="fatherFirstName"
                      value={profileDetails.fatherFirstName}
                      onChange={handleProfileDetailsChange}
                      className="w-full px-3 py-2 border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Middle Name</label>
                    <input
                      type="text"
                      name="fatherMiddleName"
                      value={profileDetails.fatherMiddleName}
                      onChange={handleProfileDetailsChange}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Last Name *</label>
                    <input
                      type="text"
                      name="fatherLastName"
                      value={profileDetails.fatherLastName}
                      onChange={handleProfileDetailsChange}
                      className="w-full px-3 py-2 border rounded"
                      required
                    />
                  </div>
                </div>

                <h4 className="font-semibold text-lg mt-6 mb-2">Mother's Full Name *</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-medium mb-1">First Name *</label>
                    <input
                      type="text"
                      name="motherFirstName"
                      value={profileDetails.motherFirstName}
                      onChange={handleProfileDetailsChange}
                      className="w-full px-3 py-2 border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Middle Name</label>
                    <input
                      type="text"
                      name="motherMiddleName"
                      value={profileDetails.motherMiddleName}
                      onChange={handleProfileDetailsChange}
                      className="w-full px-3 py-2 border rounded"
                    />
                    <p className="text-sm text-gray-500 mt-1">Auto-filled from father's first name (can be changed)</p>
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Last Name *</label>
                    <input
                      type="text"
                      name="motherLastName"
                      value={profileDetails.motherLastName}
                      onChange={handleProfileDetailsChange}
                      className="w-full px-3 py-2 border rounded"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-1">Father's Mobile Number *</label>
                    <input
                      type="text"
                      name="fatherMobile"
                      value={profileDetails.fatherMobile}
                      onChange={handleProfileDetailsChange}
                      placeholder="10 digit number"
                      className={`w-full px-3 py-2 border rounded ${validationErrors.fatherMobile ? 'border-red-500' : ''}`}
                      required
                    />
                    {validationErrors.fatherMobile && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.fatherMobile}</p>
                    )}
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Mother's Mobile Number *</label>
                    <input
                      type="text"
                      name="motherMobile"
                      value={profileDetails.motherMobile}
                      onChange={handleProfileDetailsChange}
                      placeholder="10 digit number"
                      className={`w-full px-3 py-2 border rounded ${validationErrors.motherMobile ? 'border-red-500' : ''}`}
                      required
                    />
                    {validationErrors.motherMobile && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.motherMobile}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-1">Present Village/City *</label>
                    <input
                      type="text"
                      name="presentVillageCity"
                      value={profileDetails.presentVillageCity}
                      onChange={handleProfileDetailsChange}
                      className="w-full px-3 py-2 border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Native Village/City *</label>
                    <input
                      type="text"
                      name="nativeVillageCity"
                      value={profileDetails.nativeVillageCity}
                      onChange={handleProfileDetailsChange}
                      className="w-full px-3 py-2 border rounded"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium mb-1">Complete Present Address *</label>
                  <textarea
                    name="completePresentAddress"
                    value={profileDetails.completePresentAddress}
                    onChange={handleProfileDetailsChange}
                    rows="3"
                    className="w-full px-3 py-2 border rounded"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-1">Father's Occupation *</label>
                    <input
                      type="text"
                      name="fatherOccupation"
                      value={profileDetails.fatherOccupation}
                      onChange={handleProfileDetailsChange}
                      className="w-full px-3 py-2 border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Expense Bearer *</label>
                    <select
                      name="expenseBearer"
                      value={profileDetails.expenseBearer}
                      onChange={handleProfileDetailsChange}
                      className="w-full px-3 py-2 border rounded"
                      required
                    >
                      <option value="self">Self</option>
                      <option value="mandir">Mandir</option>
                    </select>
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
                <div>
                  <label className="block font-medium mb-1">C/O Sant Name</label>
                  <input
                    type="text"
                    name="coSantName"
                    value={profileDetails.coSantName}
                    onChange={handleProfileDetailsChange}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>

                <h4 className="font-semibold text-lg mt-4 mb-2">C/O Haribhakt Full Name</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-medium mb-1">First Name</label>
                    <input
                      type="text"
                      name="coHaribhaktFirstName"
                      value={profileDetails.coHaribhaktFirstName}
                      onChange={handleProfileDetailsChange}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Middle Name</label>
                    <input
                      type="text"
                      name="coHaribhaktMiddleName"
                      value={profileDetails.coHaribhaktMiddleName}
                      onChange={handleProfileDetailsChange}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Last Name</label>
                    <input
                      type="text"
                      name="coHaribhaktLastName"
                      value={profileDetails.coHaribhaktLastName}
                      onChange={handleProfileDetailsChange}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-1">C/O Haribhakt Mobile Number</label>
                    <input
                      type="text"
                      name="coHaribhaktMobile"
                      value={profileDetails.coHaribhaktMobile}
                      onChange={handleProfileDetailsChange}
                      placeholder="10 digit number"
                      className={`w-full px-3 py-2 border rounded ${validationErrors.coHaribhaktMobile ? 'border-red-500' : ''}`}
                    />
                    {validationErrors.coHaribhaktMobile && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.coHaribhaktMobile}</p>
                    )}
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Sakshi Sant Name</label>
                    <input
                      type="text"
                      name="sakshiSantName"
                      value={profileDetails.sakshiSantName}
                      onChange={handleProfileDetailsChange}
                      className="w-full px-3 py-2 border rounded"
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
                    <label className="block font-medium mb-1">SMK Number</label>
                    <input
                      type="text"
                      name="smkNumber"
                      value={profileDetails.smkNumber}
                      onChange={handleProfileDetailsChange}
                      placeholder="NA or ABC123"
                      className={`w-full px-3 py-2 border rounded ${validationErrors.smkNumber ? 'border-red-500' : ''}`}
                    />
                    {validationErrors.smkNumber && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.smkNumber}</p>
                    )}
                    <p className="text-gray-500 text-sm mt-1">Format: 3 letters + 3 digits (e.g., ABC123) or 'NA'</p>
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Satsang Day</label>
                    <input
                      type="date"
                      name="satsangDay"
                      value={profileDetails.satsangDay}
                      onChange={handleProfileDetailsChange}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-1">Date of Birth *</label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={profileDetails.dateOfBirth}
                      onChange={handleProfileDetailsChange}
                      className="w-full px-3 py-2 border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Aadhar Card Number *</label>
                    <input
                      type="text"
                      name="aadharCardNumber"
                      value={profileDetails.aadharCardNumber}
                      onChange={handleProfileDetailsChange}
                      placeholder="12 digit number"
                      className={`w-full px-3 py-2 border rounded ${validationErrors.aadharCardNumber ? 'border-red-500' : ''}`}
                      required
                    />
                    {validationErrors.aadharCardNumber && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.aadharCardNumber}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-1">Driving License *</label>
                    <select
                      name="drivingLicense"
                      value={profileDetails.drivingLicense}
                      onChange={handleProfileDetailsChange}
                      className="w-full px-3 py-2 border rounded"
                      required
                    >
                      <option value="no">No</option>
                      <option value="MCWOG">Motorcycle Without Gear (MCWOG)</option>
                      <option value="MCWG">Motorcycle With Gear (MCWG)</option>
                      <option value="4_wheeler">4 Wheeler</option>
                    </select>
                  </div>
                  {profileDetails.drivingLicense !== "no" && (
                    <div>
                      <label className="block font-medium mb-1">Driving License Number *</label>
                      <input
                        type="text"
                        name="drivingLicenseNumber"
                        value={profileDetails.drivingLicenseNumber}
                        onChange={handleProfileDetailsChange}
                        className="w-full px-3 py-2 border rounded"
                        required={profileDetails.drivingLicense !== "no"}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-1">Blood Group *</label>
                    <select
                      name="bloodGroup"
                      value={profileDetails.bloodGroup}
                      onChange={handleProfileDetailsChange}
                      className="w-full px-3 py-2 border rounded"
                      required
                    >
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Health Insurance *</label>
                    <div className="flex items-center space-x-4 mt-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="healthInsurance"
                          value="true"
                          checked={profileDetails.healthInsurance === true}
                          onChange={() => setProfileDetails({...profileDetails, healthInsurance: true})}
                          className="mr-2"
                        />
                        Yes
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="healthInsurance"
                          value="false"
                          checked={profileDetails.healthInsurance === false}
                          onChange={() => setProfileDetails({...profileDetails, healthInsurance: false})}
                          className="mr-2"
                        />
                        No
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={saving || Object.keys(validationErrors).length > 0}
          >
            {saving ? "Saving Profile Details..." : "Save Profile Details"}
          </button>
        </form>
      )}
    </div>
  );
};

export default ProfilePage;
