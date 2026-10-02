import axios from 'axios';

// The base API URL is configurable via environment variable VITE_API_URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: inject Authorization Bearer token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    try {
      config.headers['X-Client-Timezone'] = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      // Browser timezone unavailable; server falls back to APP_TIMEZONE
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: centralized error handling
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response) {
      // Server returned error status code (4xx, 5xx)
      const status = error.response.status;

      // If token expired / unauthorized, clear token and redirect to login
      if (status === 401) {
        const isAuthRoute = window.location.pathname.includes('/login') || window.location.pathname.includes('/register');
        if (!isAuthRoute) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login?session=expired';
        }
      }

      const errorMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        (Array.isArray(error.response.data?.errors) ? error.response.data.errors.join(', ') : 'An error occurred');

      return Promise.reject(new Error(errorMessage));
    } else if (error.request) {
      // Request was made but no response was received (Network error / server down)
      return Promise.reject(new Error('Network error: Unable to connect to server. Please check your internet connection or server status.'));
    } else {
      return Promise.reject(error);
    }
  }
);

export default api;
