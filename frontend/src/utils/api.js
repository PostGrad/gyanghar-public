import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Global callbacks for handling 429 errors
let showToastCallback = null;
let logoutCallback = null;

// Function to set the callbacks from React components
export const setGlobalErrorHandlers = (showToast, logout) => {
  showToastCallback = showToast;
  logoutCallback = logout;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle 429 and 403 status codes
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Log all error details for debugging

    // Check if we have a response (HTTP error) vs network error
    if (!error.response) {
      // This could be CORS, network timeout, server down, etc.
      // Don't logout for network errors
      return Promise.reject(error);
    }

    const status = error.response.status;

    // Handle 403 Forbidden (invalid/expired token)
    if (status === 403) {
      // Show toast notification
      if (showToastCallback) {
        showToastCallback(
          "Your session has expired. Please log in again.",
          "error",
          3000
        );
      } else {
      }

      // Logout user immediately for expired token
      setTimeout(() => {
        if (logoutCallback) {
          logoutCallback();
        } else {
          localStorage.clear();
          window.location.href = "/login";
        }
      }, 1000);
    }

    // Handle 429 Too Many Requests
    else if (status === 429) {
      // Show toast notification
      if (showToastCallback) {
        showToastCallback(
          "Too many requests. Please try again later. You will be logged out for security.",
          "error",
          5000
        );
      } else {
      }

      // Logout user after a short delay
      setTimeout(() => {
        if (logoutCallback) {
          logoutCallback();
        } else {
          localStorage.clear();
          window.location.href = "/login";
        }
      }, 2000);
    }

    // Handle 401 Unauthorized (just in case)
    else if (status === 401) {
      if (showToastCallback) {
        showToastCallback(
          "Authentication failed. Please log in again.",
          "error",
          3000
        );
      }

      setTimeout(() => {
        if (logoutCallback) {
          logoutCallback();
        } else {
          localStorage.clear();
          window.location.href = "/login";
        }
      }, 1000);
    }

    return Promise.reject(error);
  }
);

export const auth = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }),
  resetPassword: (token, password) =>
    api.post("/auth/reset-password", { token, password }),
  verifyResetToken: (token) => api.get(`/auth/verify-reset-token/${token}`),
};

export const users = {
  getMe: (data) => api.post(`/users/profile`, data),
  getPending: () => api.get("/users/pending"),
  approve: (id, role) => api.post(`/users/approve/${id}`, { role }),
  getStudents: (showInactive = false) => api.get("/users/students", { params: { showInactive } }),
  getMonitors: () => api.get("/users/monitors"),
  getAll: () => api.get("/users/all"),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  updateProfile: (id, data) => api.put(`/users/profile/${id}`, data),
  toggleActive: (id) => api.put(`/users/${id}/toggle-active`),
};

// User settings cache helpers
const USER_SETTINGS_CACHE_KEY = "user_settings_cache";

const getCachedUserSettings = () => {
  try {
    const cached = localStorage.getItem(USER_SETTINGS_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    localStorage.removeItem(USER_SETTINGS_CACHE_KEY);
    return null;
  }
};

const setCachedUserSettings = (settings) => {
  try {
    localStorage.setItem(USER_SETTINGS_CACHE_KEY, JSON.stringify(settings));
  } catch (error) {}
};

const clearCachedUserSettings = () => {
  localStorage.removeItem(USER_SETTINGS_CACHE_KEY);
};

export const accountability = {
  create: (data) => api.post("/accountability/create", data),
  list: (params) => api.get("/accountability/list", { params }),
  report: (params) => api.get("/accountability/report", { params }),

  getUserSettings: async (forceRefresh = false) => {
    // Check cache first unless forced refresh
    if (!forceRefresh) {
      const cached = getCachedUserSettings();
      if (cached) {
        return { data: cached };
      }
    }

    try {
      const response = await api.get("/accountability/user-settings");

      // Cache the response
      setCachedUserSettings(response.data);

      return response;
    } catch (error) {
      throw error;
    }
  },

  updateUserSettings: async (settings) => {
    try {
      const response = await api.put("/accountability/user-settings", {
        settings,
      });

      // Update cache with new settings
      setCachedUserSettings(settings);

      return response;
    } catch (error) {
      throw error;
    }
  },

  // Helper function to clear settings cache (used on logout)
  clearUserSettingsCache: clearCachedUserSettings,
};

export const assignments = {
  getPoshaks: () => api.get("/assignments/poshaks"),
  assignPoshak: (data) => api.post("/assignments/poshak", data),
  getPoshakAssignments: () => api.get("/assignments/poshak"),
  deletePoshakAssignment: (id) => api.delete(`/assignments/poshak/${id}`),
  assignMonitor: (data) => api.post("/assignments/monitor", data),
  getMonitorAssignments: () => api.get("/assignments/monitor"),
  deleteMonitorAssignment: (id) => api.delete(`/assignments/monitor/${id}`),
  getAssignedStudents: (monitorId) =>
    api.get(`/assignments/monitor/${monitorId}/students`),
};

export const profile = {
  get: (userId) => api.get(`/profile/${userId}`),
  save: (data) => api.post("/profile", data),
};

export default api;
