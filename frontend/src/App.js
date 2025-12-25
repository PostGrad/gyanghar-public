import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { users, setGlobalErrorHandlers, accountability } from "./utils/api";
import { ToastProvider, useToast } from "./contexts/ToastContext";
import { AdminSettingsProvider } from "./contexts/AdminSettingsContext";
import Navbar from "./components/Navbar";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import DailyFormPage from "./pages/DailyFormPage";
import AdminPage from "./pages/AdminPage";
import AssignmentsPage from "./pages/AssignmentsPage";
import UserManagementPage from "./pages/UserManagementPage";
import ProfilePage from "./pages/ProfilePage";
import ReportPage from "./pages/ReportPage";
import StudentProfilesPage from "./pages/StudentProfilesPage";
import StudentDetailPage from "./pages/StudentDetailPage";
import AdhyatmikReportPage from "./pages/AdhyatmikReportPage";

// Inner component that has access to toast context
function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showError } = useToast();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  // Set up global error handlers for 429 status codes
  useEffect(() => {
    const logout = () => {
      // Clear user settings cache specifically
      accountability.clearUserSettingsCache();

      // Clear all localStorage data (comprehensive logout)
      localStorage.clear();

      // Alternatively, if you want to be selective, you can remove specific keys:
      // localStorage.removeItem("token");
      // localStorage.removeItem("user");
      // localStorage.removeItem("preferences");
      // accountability.clearUserSettingsCache();

      setUser(null);
    };

    setGlobalErrorHandlers(showError, logout);
  }, [showError]);

  const fetchUser = async () => {
    try {
      const response = await users.getMe();
      setUser(response.data[0]);
    } catch (error) {
      // Clear user settings cache specifically
      accountability.clearUserSettingsCache();

      // Clear all localStorage data if user fetch fails (invalid token)
      localStorage.clear();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        {user && <Navbar user={user} setUser={setUser} />}

        <Routes>
          <Route
            path="/login"
            element={
              !user ? (
                <LoginPage setUser={setUser} />
              ) : (
                <Navigate to="/dashboard" />
              )
            }
          />
          <Route
            path="/register"
            element={!user ? <RegisterPage /> : <Navigate to="/dashboard" />}
          />
          <Route
            path="/forgot-password"
            element={
              !user ? <ForgotPasswordPage /> : <Navigate to="/dashboard" />
            }
          />
          <Route
            path="/reset-password"
            element={
              !user ? <ResetPasswordPage /> : <Navigate to="/dashboard" />
            }
          />
          <Route
            path="/dashboard"
            element={
              user ? <DashboardPage user={user} /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/daily-form"
            element={
              user ? <DailyFormPage user={user} /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/admin"
            element={
              user?.role === "admin" ? (
                <AdminPage />
              ) : (
                <Navigate to="/dashboard" />
              )
            }
          />
          <Route
            path="/assignments"
            element={
              user?.role === "admin" ? (
                <AssignmentsPage user={user} />
              ) : (
                <Navigate to="/dashboard" />
              )
            }
          />
          <Route
            path="/user-management"
            element={
              user?.role === "admin" ? (
                <UserManagementPage />
              ) : (
                <Navigate to="/dashboard" />
              )
            }
          />
          <Route
            path="/profile"
            element={
              user ? <ProfilePage user={user} /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/report"
            element={
              user?.role === "student" ? (
                <ReportPage user={user} />
              ) : (
                <Navigate to="/dashboard" />
              )
            }
          />
          <Route
            path="/student-profiles"
            element={
              user?.role === "admin" || user?.role === "poshak_leader" ? (
                <StudentProfilesPage user={user} />
              ) : (
                <Navigate to="/dashboard" />
              )
            }
          />
          <Route
            path="/student-profile/:studentId"
            element={
              user?.role === "admin" || user?.role === "poshak_leader" ? (
                <StudentDetailPage user={user} />
              ) : (
                <Navigate to="/dashboard" />
              )
            }
          />
          <Route
            path="/adhyatmik-report"
            element={
              user?.role === "admin" || user?.role === "poshak_leader" ? (
                <AdhyatmikReportPage user={user} />
              ) : (
                <Navigate to="/dashboard" />
              )
            }
          />
          <Route
            path="/"
            element={<Navigate to={user ? "/dashboard" : "/login"} />}
          />
        </Routes>
      </div>
    </Router>
  );
}

function App() {
  return (
    <ToastProvider>
      <AdminSettingsProvider>
        <AppContent />
      </AdminSettingsProvider>
    </ToastProvider>
  );
}

export default App;
