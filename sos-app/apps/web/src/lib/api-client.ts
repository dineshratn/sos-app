import axios, { AxiosInstance, AxiosError } from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = Cookies.get('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          Cookies.remove('auth_token');
          Cookies.remove('refresh_token');
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication endpoints
  async login(email: string, password: string) {
    const response = await this.client.post('/api/v1/auth/login', {
      email,
      password,
    });
    return response.data;
  }

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  }) {
    const response = await this.client.post('/api/v1/auth/register', data);
    return response.data;
  }

  async logout() {
    const response = await this.client.post('/api/v1/auth/logout');
    Cookies.remove('auth_token');
    Cookies.remove('refresh_token');
    return response.data;
  }

  async refreshToken() {
    const refreshToken = Cookies.get('refresh_token');
    const response = await this.client.post('/api/v1/auth/refresh', {
      refreshToken,
    });
    return response.data;
  }

  // User endpoints
  async getProfile() {
    const response = await this.client.get('/api/v1/users/profile');
    return response.data;
  }

  async updateProfile(data: Partial<any>) {
    const response = await this.client.put('/api/v1/users/profile', data);
    return response.data;
  }

  // Emergency endpoints
  async triggerEmergency(data: {
    type: string;
    description?: string;
    location?: { latitude: number; longitude: number };
  }) {
    const response = await this.client.post('/api/v1/emergency/trigger', data);
    return response.data;
  }

  async cancelEmergency(emergencyId: string) {
    const response = await this.client.post(
      `/api/v1/emergency/${emergencyId}/cancel`
    );
    return response.data;
  }

  async resolveEmergency(emergencyId: string) {
    const response = await this.client.post(
      `/api/v1/emergency/${emergencyId}/resolve`
    );
    return response.data;
  }

  async getActiveEmergency() {
    const response = await this.client.get('/api/v1/emergency/active');
    return response.data;
  }

  async getEmergencyHistory(params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const response = await this.client.get('/api/v1/emergency/history', {
      params,
    });
    return response.data;
  }

  async getEmergencyById(emergencyId: string) {
    const response = await this.client.get(`/api/v1/emergency/${emergencyId}`);
    return response.data;
  }

  // Contact endpoints
  async getContacts() {
    const response = await this.client.get('/api/v1/contacts');
    return response.data;
  }

  async addContact(data: {
    name: string;
    phoneNumber: string;
    email?: string;
    relationship: string;
    priority: number;
  }) {
    const response = await this.client.post('/api/v1/contacts', data);
    return response.data;
  }

  async updateContact(contactId: string, data: Partial<any>) {
    const response = await this.client.put(
      `/api/v1/contacts/${contactId}`,
      data
    );
    return response.data;
  }

  async deleteContact(contactId: string) {
    const response = await this.client.delete(`/api/v1/contacts/${contactId}`);
    return response.data;
  }

  // Medical profile endpoints
  async getMedicalProfile() {
    const response = await this.client.get('/api/v1/medical/profile');
    return response.data;
  }

  async updateMedicalProfile(data: {
    bloodType?: string;
    allergies?: string[];
    medications?: Array<{ name: string; dosage: string }>;
    conditions?: string[];
  }) {
    const response = await this.client.put('/api/v1/medical/profile', data);
    return response.data;
  }

  // Location endpoints
  async updateLocation(emergencyId: string, location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  }) {
    const response = await this.client.post('/api/v1/location/update', {
      emergencyId,
      ...location,
    });
    return response.data;
  }

  async getLocationTrail(emergencyId: string) {
    const response = await this.client.get(
      `/api/v1/location/trail/${emergencyId}`
    );
    return response.data;
  }
}

export const apiClient = new APIClient();
