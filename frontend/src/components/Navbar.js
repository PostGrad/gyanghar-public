import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { accountability } from "../utils/api";

const Navbar = ({ user, setUser }) => {
  const [profileDropdown, setProfileDropdown] = useState(false);
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    // Clear user settings cache specifically
    accountability.clearUserSettingsCache();

    // Clear all localStorage data for complete logout
    localStorage.clear();
    setUser(null);
    navigate("/login");
  };

  return (
    <>
      <nav className="bg-blue-600 text-white fixed top-0 left-0 w-full z-50 shadow ">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold">
              <button onClick={() => navigate("/dashboard")}>
                Gyan Ghar App
              </button>
            </h1>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="hover:bg-blue-700 bg-blue-500 px-3 py-2 rounded text-sm"
              >
                Dashboard
              </button>

              {user?.role === "student" && (
                <>
                  <button
                    onClick={() => navigate("/daily-form")}
                    className="hover:bg-blue-700 px-3 py-2 rounded text-sm bg-blue-500"
                  >
                    Daily Form
                  </button>
                  <button
                    onClick={() => navigate("/report")}
                    className="hover:bg-blue-700 px-3 py-2 rounded text-sm bg-blue-500"
                  >
                    My Report
                  </button>
                </>
              )}

              {(user?.role === "admin" || user?.role === "poshak_leader") && (
                <>
                  <button
                    onClick={() => navigate("/student-profiles")}
                    className="hover:bg-blue-700 px-3 py-2 rounded text-sm bg-blue-500"
                  >
                    Student Profiles
                  </button>
                  <button
                    onClick={() => navigate("/adhyatmik-report")}
                    className="hover:bg-blue-700 px-3 py-2 rounded text-sm bg-blue-500"
                  >
                    Adhyatmik Report
                  </button>
                </>
              )}

              {user?.role === "admin" && (
                <>
                  <button
                    onClick={() => navigate("/admin")}
                    className="hover:bg-blue-700 px-3 py-2 rounded text-sm bg-blue-500"
                  >
                    Admin
                  </button>
                  <button
                    onClick={() => navigate("/assignments")}
                    className="hover:bg-blue-700 px-3 py-2 rounded text-sm bg-blue-500"
                  >
                    Assignments
                  </button>
                  <button
                    onClick={() => navigate("/user-management")}
                    className="hover:bg-blue-700 px-3 py-2 rounded text-sm bg-blue-500"
                  >
                    Users
                  </button>
                </>
              )}

              {/* Profile Icon Dropdown */}
              <div className="relative">
                <button
                  className="w-10 h-10 rounded-full bg-white text-blue-600 flex items-center justify-center shadow hover:ring-2 hover:ring-blue-300 focus:outline-none"
                  onClick={() => setProfileDropdown((v) => !v)}
                  aria-label="Profile"
                >
                  <span className="font-bold text-lg">
                    {user && user.firstName && user.firstName.length > 0
                      ? user.firstName[0]
                      : "U"}
                  </span>
                </button>
                {profileDropdown && (
                  <div className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-lg z-11 border">
                    <div className="flex flex-col py-2">
                      <div className="px-4 py-2 text-gray-700 font-semibold border-b">
                        {user && user.firstName ? user.firstName : "User"}{" "}
                        {user && user.lastName ? user.lastName : ""}
                      </div>
                      <button
                        onClick={() => {
                          setProfileDropdown(false);
                          navigate("/profile");
                        }}
                        className="px-4 py-2 text-left hover:bg-gray-100 text-gray-700"
                      >
                        Profile
                      </button>
                      <button
                        onClick={() => {
                          setProfileDropdown(false);
                          handleLogout();
                        }}
                        className="px-4 py-2 text-left hover:bg-gray-100 text-red-600"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={
                    isMenuOpen
                      ? "M6 18L18 6M6 6l12 12"
                      : "M4 6h16M4 12h16M4 18h16"
                  }
                />
              </svg>
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden pb-4">
              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => {
                    navigate("/dashboard");
                    setIsMenuOpen(false);
                  }}
                  className="hover:bg-blue-700 px-3 py-2 rounded text-left bg-blue-500"
                >
                  Dashboard
                </button>

                {user?.role === "student" && (
                  <>
                    <button
                      onClick={() => {
                        navigate("/daily-form");
                        setIsMenuOpen(false);
                      }}
                      className="hover:bg-blue-700 px-3 py-2 rounded text-left bg-blue-500"
                    >
                      Daily Form
                    </button>
                    <button
                      onClick={() => {
                        navigate("/report");
                        setIsMenuOpen(false);
                      }}
                      className="hover:bg-blue-700 px-3 py-2 rounded text-left bg-blue-500"
                    >
                      My Report
                    </button>
                  </>
                )}

                {(user?.role === "admin" || user?.role === "poshak_leader") && (
                  <>
                    <button
                      onClick={() => {
                        navigate("/student-profiles");
                        setIsMenuOpen(false);
                      }}
                      className="hover:bg-blue-700 px-3 py-2 rounded text-left bg-blue-500"
                    >
                      Student Profiles
                    </button>
                    <button
                      onClick={() => {
                        navigate("/adhyatmik-report");
                        setIsMenuOpen(false);
                      }}
                      className="hover:bg-blue-700 px-3 py-2 rounded text-left bg-blue-500"
                    >
                      Adhyatmik Report
                    </button>
                  </>
                )}

                {user?.role === "admin" && (
                  <>
                    <button
                      onClick={() => {
                        navigate("/admin");
                        setIsMenuOpen(false);
                      }}
                      className="hover:bg-blue-700 px-3 py-2 rounded text-left bg-blue-500"
                    >
                      Admin
                    </button>
                    <button
                      onClick={() => {
                        navigate("/assignments");
                        setIsMenuOpen(false);
                      }}
                      className="hover:bg-blue-700 px-3 py-2 rounded text-left bg-blue-500"
                    >
                      Assignments
                    </button>
                    <button
                      onClick={() => {
                        navigate("/user-management");
                        setIsMenuOpen(false);
                      }}
                      className="hover:bg-blue-700 px-3 py-2 rounded text-left bg-blue-500"
                    >
                      Users
                    </button>
                  </>
                )}

                {/* Profile Dropdown for mobile */}
                <div className="border-t border-blue-500 pt-2 mt-2">
                  <button
                    className="w-10 h-10 rounded-full bg-white text-blue-600 flex items-center justify-center shadow mx-3 mb-2"
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigate("/profile");
                    }}
                    aria-label="Profile"
                  >
                    <span className="font-bold text-lg">
                      {user && user.firstName && user.firstName.length > 0
                        ? user.firstName[0]
                        : "U"}
                    </span>
                  </button>
                  <div className="px-3 py-2 text-sm">
                    {user && user.firstName ? user.firstName : "User"}{" "}
                    {user && user.lastName ? user.lastName : ""}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-sm w-full text-left"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Menu Backdrop */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-40 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </>
  );
};

export default Navbar;
