import axios from 'axios';
import { API_ENDPOINTS } from '../config';

// Create axios instance with default config
const api = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Service health check
export const checkServiceHealth = async (serviceName, endpoint) => {
  try {
    const response = await axios.get(`${endpoint}/health`, { timeout: 5000 });
    return {
      service: serviceName,
      status: 'healthy',
      data: response.data,
    };
  } catch (error) {
    return {
      service: serviceName,
      status: 'unhealthy',
      error: error.message,
    };
  }
};

// Authentication Service
export const authService = {
  login: (credentials) => api.post(`${API_ENDPOINTS.AUTH_SERVICE}/api/auth/login`, credentials),
  register: (userData) => api.post(`${API_ENDPOINTS.AUTH_SERVICE}/api/auth/register`, userData),
  logout: () => api.post(`${API_ENDPOINTS.AUTH_SERVICE}/api/auth/logout`),
};

// User Service
export const userService = {
  getProfile: () => api.get(`${API_ENDPOINTS.USER_SERVICE}/api/users/profile`),
  updateProfile: (data) => api.put(`${API_ENDPOINTS.USER_SERVICE}/api/users/profile`, data),
  getUsers: () => api.get(`${API_ENDPOINTS.USER_SERVICE}/api/users`),
};

// Medical Service
export const medicalService = {
  getMedicalRecords: (userId) => api.get(`${API_ENDPOINTS.MEDICAL_SERVICE}/api/medical/records/${userId}`),
  addMedicalRecord: (data) => api.post(`${API_ENDPOINTS.MEDICAL_SERVICE}/api/medical/records`, data),
};

// Location Service
export const locationService = {
  updateLocation: (data) => api.post(`${API_ENDPOINTS.LOCATION_SERVICE}/api/location/update`, data),
  getLocation: (userId) => api.get(`${API_ENDPOINTS.LOCATION_SERVICE}/api/location/${userId}`),
};

// Notification Service
export const notificationService = {
  getNotifications: () => api.get(`${API_ENDPOINTS.NOTIFICATION_SERVICE}/api/notifications`),
  sendNotification: (data) => api.post(`${API_ENDPOINTS.NOTIFICATION_SERVICE}/api/notifications/send`, data),
};

// Communication Service
export const communicationService = {
  getMessages: () => api.get(`${API_ENDPOINTS.COMMUNICATION_SERVICE}/api/messages`),
  sendMessage: (data) => api.post(`${API_ENDPOINTS.COMMUNICATION_SERVICE}/api/messages/send`, data),
};

// Device Service
export const deviceService = {
  getDevices: () => api.get(`${API_ENDPOINTS.DEVICE_SERVICE}/api/devices`),
  registerDevice: (data) => api.post(`${API_ENDPOINTS.DEVICE_SERVICE}/api/devices/register`, data),
};

// LLM Service
export const llmService = {
  chat: (message) => api.post(`${API_ENDPOINTS.LLM_SERVICE}/api/llm/chat`, { message }),
  analyze: (data) => api.post(`${API_ENDPOINTS.LLM_SERVICE}/api/llm/analyze`, data),
};

export default api;
