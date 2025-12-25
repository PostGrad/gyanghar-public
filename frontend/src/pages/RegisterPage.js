import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../utils/api";
import { useToast } from "../contexts/ToastContext";
import { HiEye, HiEyeOff } from "react-icons/hi";

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    whatsapp: "",
    roomNumber: "",
    sameAsPhone: true,
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const validatePassword = (password) => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/(?=.*\d)/.test(password)) {
      return "Password must contain at least one number";
    }
    return null;
  };

  const validateField = (name, value) => {
    const errors = { ...validationErrors };

    switch (name) {
      case "firstName":
      case "lastName":
        if (!value.trim()) {
          errors[name] = "This field is required";
        } else if (!/^[a-zA-Z\s]*$/.test(value)) {
          errors[name] = "Only letters and spaces are allowed";
        } else {
          delete errors[name];
        }
        break;
      case "email":
        if (!value.trim()) {
          errors[name] = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(value)) {
          errors[name] = "Please enter a valid email";
        } else {
          delete errors[name];
        }
        break;
      case "password":
        if (!value) {
          errors[name] = "Password is required";
        } else {
          const passwordError = validatePassword(value);
          if (passwordError) {
            errors[name] = passwordError;
          } else {
            delete errors[name];
          }
        }
        break;
      case "phone":
        if (!value.trim()) {
          errors[name] = "Phone number is required";
        } else if (!/^\d{10}$/.test(value)) {
          errors[name] = "Must be exactly 10 digits";
        } else {
          delete errors[name];
        }
        break;
      case "whatsapp":
        // Only validate WhatsApp if it's not same as phone and has a value
        if (!formData.sameAsPhone && value && !/^\d{10}$/.test(value)) {
          errors[name] = "Must be exactly 10 digits";
        } else {
          delete errors[name];
        }
        break;
      case "roomNumber":
        if (value && !/^[a-zA-Z0-9]*$/.test(value)) {
          errors[name] = "Only letters and numbers are allowed";
        } else {
          delete errors[name];
        }
        break;
      default:
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field, value) => {
    let updatedFormData = { ...formData, [field]: value };

    // If phone number changes and sameAsPhone is true, update whatsapp
    if (field === "phone" && formData.sameAsPhone) {
      updatedFormData.whatsapp = value;
    }

    setFormData(updatedFormData);
    validateField(field, value);
  };

  const handleCheckboxChange = (checked) => {
    const updatedFormData = {
      ...formData,
      sameAsPhone: checked,
      whatsapp: checked ? formData.phone : "",
    };
    setFormData(updatedFormData);

    // Clear WhatsApp validation error when checkbox is checked
    if (checked) {
      const errors = { ...validationErrors };
      delete errors.whatsapp;
      setValidationErrors(errors);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all fields before submitting
    const fieldsToValidate = [
      "firstName",
      "lastName",
      "email",
      "password",
      "phone",
      "roomNumber",
    ];
    if (!formData.sameAsPhone) {
      fieldsToValidate.push("whatsapp");
    }

    let isValid = true;
    fieldsToValidate.forEach((field) => {
      if (!validateField(field, formData[field])) {
        isValid = false;
      }
    });

    if (!isValid) {
      showError("Please fix validation errors before submitting");
      return;
    }

    setLoading(true);

    try {
      const submitData = {
        ...formData,
        whatsapp: formData.sameAsPhone ? formData.phone : formData.whatsapp,
      };

      await auth.register(submitData);
      showSuccess("Registration successful! Please wait for admin approval.");
      setTimeout(() => navigate("/login"), 3000);
    } catch (error) {
      showError(error.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-center mb-6">Register</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                required
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.firstName
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
              />
              {validationErrors.firstName && (
                <p className="text-red-500 text-xs mt-1">
                  {validationErrors.firstName}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                required
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.lastName
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
              />
              {validationErrors.lastName && (
                <p className="text-red-500 text-xs mt-1">
                  {validationErrors.lastName}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validationErrors.email ? "border-red-500" : "border-gray-300"
              }`}
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
            />
            {validationErrors.email && (
              <p className="text-red-500 text-xs mt-1">
                {validationErrors.email}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength="6"
                className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.password
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <HiEyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 cursor-pointer" />
                ) : (
                  <HiEye className="h-5 w-5 text-gray-400 hover:text-gray-600 cursor-pointer" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              At least 8 characters with uppercase, lowercase, and number
            </p>
            {validationErrors.password && (
              <p className="text-red-500 text-xs mt-1">
                {validationErrors.password}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mobile Number
            </label>
            <input
              type="tel"
              required
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validationErrors.phone ? "border-red-500" : "border-gray-300"
              }`}
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
            />
            {validationErrors.phone && (
              <p className="text-red-500 text-xs mt-1">
                {validationErrors.phone}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="sameAsPhone"
                checked={formData.sameAsPhone}
                onChange={(e) => handleCheckboxChange(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="sameAsPhone" className="text-sm text-gray-700">
                Same as mobile number
              </label>
            </div>
            <input
              type="tel"
              disabled={formData.sameAsPhone}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formData.sameAsPhone ? "bg-gray-100 cursor-not-allowed" : ""
              } ${
                validationErrors.whatsapp ? "border-red-500" : "border-gray-300"
              }`}
              value={formData.whatsapp}
              onChange={(e) => handleInputChange("whatsapp", e.target.value)}
            />
            {validationErrors.whatsapp && (
              <p className="text-red-500 text-xs mt-1">
                {validationErrors.whatsapp}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room Number
            </label>
            <input
              type="text"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validationErrors.roomNumber
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
              value={formData.roomNumber}
              onChange={(e) => handleInputChange("roomNumber", e.target.value)}
            />
            {validationErrors.roomNumber && (
              <p className="text-red-500 text-xs mt-1">
                {validationErrors.roomNumber}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || Object.keys(validationErrors).length > 0}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <p className="text-center mt-4 text-sm text-gray-600">
          Already have an account?{" "}
          <button
            onClick={() => navigate("/login")}
            className="text-blue-600 hover:underline"
          >
            Login here
          </button>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
