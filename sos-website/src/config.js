// API Configuration for SOS Services
// Update these URLs based on your deployment environment

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost';

export const API_ENDPOINTS = {
  // Gateway
  API_GATEWAY: `${API_BASE_URL}:3000`,

  // Core Services (excluding emergency-service as requested)
  AUTH_SERVICE: `${API_BASE_URL}:3001`,
  USER_SERVICE: `${API_BASE_URL}:3002`,
  MEDICAL_SERVICE: `${API_BASE_URL}:3003`,
  LOCATION_SERVICE: `${API_BASE_URL}:3004`,
  NOTIFICATION_SERVICE: `${API_BASE_URL}:3005`,
  COMMUNICATION_SERVICE: `${API_BASE_URL}:3006`,
  DEVICE_SERVICE: `${API_BASE_URL}:3007`,
  LLM_SERVICE: `${API_BASE_URL}:3008`,
};

export const SERVICE_NAMES = {
  AUTH: 'Authentication Service',
  USER: 'User Management',
  MEDICAL: 'Medical Records',
  LOCATION: 'Location Tracking',
  NOTIFICATION: 'Notifications',
  COMMUNICATION: 'Communication',
  DEVICE: 'Device Management',
  LLM: 'AI Assistant',
};

export default API_ENDPOINTS;
