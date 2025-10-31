/**
 * Typed API endpoint methods for SOS App
 *
 * @packageDocumentation
 */

import type { ApiClient } from './client';
import type { ApiResponse } from './config';

// Import types from shared library
// Note: These imports assume @sos-app/shared is available
// Services will need to install @sos-app/shared as a dependency

/**
 * Authentication API endpoints
 */
export class AuthApi {
  constructor(private client: ApiClient) {}

  /**
   * Register new user
   */
  async register(data: any): Promise<ApiResponse<any>> {
    return this.client.post('/auth/register', data);
  }

  /**
   * Login with credentials
   */
  async login(credentials: any): Promise<ApiResponse<any>> {
    return this.client.post('/auth/login', credentials);
  }

  /**
   * Login with social provider
   */
  async loginWithSocial(provider: string, token: string): Promise<ApiResponse<any>> {
    return this.client.post('/auth/social', { provider, token });
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<ApiResponse<any>> {
    return this.client.post('/auth/refresh', { refreshToken });
  }

  /**
   * Logout
   */
  async logout(): Promise<ApiResponse<void>> {
    return this.client.post('/auth/logout');
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<ApiResponse<void>> {
    return this.client.post('/auth/password-reset', { email });
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<void>> {
    return this.client.post('/auth/password-reset/confirm', { token, newPassword });
  }

  /**
   * Change password
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    return this.client.post('/auth/password-change', { oldPassword, newPassword });
  }
}

/**
 * User API endpoints
 */
export class UserApi {
  constructor(private client: ApiClient) {}

  /**
   * Get current user profile
   */
  async getProfile(): Promise<ApiResponse<any>> {
    return this.client.get('/users/me');
  }

  /**
   * Update user profile
   */
  async updateProfile(data: any): Promise<ApiResponse<any>> {
    return this.client.put('/users/me', data);
  }

  /**
   * Delete user account
   */
  async deleteAccount(): Promise<ApiResponse<void>> {
    return this.client.delete('/users/me');
  }

  /**
   * Get emergency contacts
   */
  async getEmergencyContacts(): Promise<ApiResponse<any[]>> {
    return this.client.get('/contacts');
  }

  /**
   * Add emergency contact
   */
  async addEmergencyContact(contact: any): Promise<ApiResponse<any>> {
    return this.client.post('/contacts', contact);
  }

  /**
   * Update emergency contact
   */
  async updateEmergencyContact(id: string, data: any): Promise<ApiResponse<any>> {
    return this.client.put(`/contacts/${id}`, data);
  }

  /**
   * Delete emergency contact
   */
  async deleteEmergencyContact(id: string): Promise<ApiResponse<void>> {
    return this.client.delete(`/contacts/${id}`);
  }
}

/**
 * Emergency API endpoints
 */
export class EmergencyApi {
  constructor(private client: ApiClient) {}

  /**
   * Trigger emergency alert
   */
  async triggerEmergency(data: any): Promise<ApiResponse<any>> {
    return this.client.post('/emergency/trigger', data);
  }

  /**
   * Get emergency details
   */
  async getEmergency(id: string): Promise<ApiResponse<any>> {
    return this.client.get(`/emergency/${id}`);
  }

  /**
   * Cancel emergency
   */
  async cancelEmergency(id: string, reason?: string): Promise<ApiResponse<void>> {
    return this.client.put(`/emergency/${id}/cancel`, { reason });
  }

  /**
   * Resolve emergency
   */
  async resolveEmergency(id: string, notes?: string): Promise<ApiResponse<void>> {
    return this.client.put(`/emergency/${id}/resolve`, { notes });
  }

  /**
   * Acknowledge emergency (for emergency contacts)
   */
  async acknowledgeEmergency(id: string, data?: any): Promise<ApiResponse<void>> {
    return this.client.post(`/emergency/${id}/acknowledge`, data);
  }

  /**
   * Get emergency history
   */
  async getHistory(filters?: any): Promise<ApiResponse<any[]>> {
    return this.client.get('/emergency/history', filters);
  }

  /**
   * Export emergency report
   */
  async exportReport(id: string, format: string): Promise<void> {
    return this.client.download(`/emergency/${id}/export?format=${format}`, `emergency_${id}.${format}`);
  }
}

/**
 * Location API endpoints
 */
export class LocationApi {
  constructor(private client: ApiClient) {}

  /**
   * Update location
   */
  async updateLocation(data: any): Promise<ApiResponse<void>> {
    return this.client.post('/location/update', data);
  }

  /**
   * Get location trail
   */
  async getLocationTrail(emergencyId: string, params?: any): Promise<ApiResponse<any>> {
    return this.client.get(`/location/track/${emergencyId}`, params);
  }

  /**
   * Get current location
   */
  async getCurrentLocation(emergencyId: string): Promise<ApiResponse<any>> {
    return this.client.get(`/location/current/${emergencyId}`);
  }
}

/**
 * Medical API endpoints
 */
export class MedicalApi {
  constructor(private client: ApiClient) {}

  /**
   * Get medical profile
   */
  async getProfile(): Promise<ApiResponse<any>> {
    return this.client.get('/medical/profile');
  }

  /**
   * Update medical profile
   */
  async updateProfile(data: any): Promise<ApiResponse<any>> {
    return this.client.put('/medical/profile', data);
  }

  /**
   * Get medical profile by user ID (for authorized contacts)
   */
  async getProfileByUserId(userId: string): Promise<ApiResponse<any>> {
    return this.client.get(`/medical/profile/${userId}`);
  }

  /**
   * Add allergy
   */
  async addAllergy(data: any): Promise<ApiResponse<any>> {
    return this.client.post('/medical/allergies', data);
  }

  /**
   * Update allergy
   */
  async updateAllergy(id: string, data: any): Promise<ApiResponse<any>> {
    return this.client.put(`/medical/allergies/${id}`, data);
  }

  /**
   * Delete allergy
   */
  async deleteAllergy(id: string): Promise<ApiResponse<void>> {
    return this.client.delete(`/medical/allergies/${id}`);
  }

  /**
   * Add medication
   */
  async addMedication(data: any): Promise<ApiResponse<any>> {
    return this.client.post('/medical/medications', data);
  }

  /**
   * Update medication
   */
  async updateMedication(id: string, data: any): Promise<ApiResponse<any>> {
    return this.client.put(`/medical/medications/${id}`, data);
  }

  /**
   * Delete medication
   */
  async deleteMedication(id: string): Promise<ApiResponse<void>> {
    return this.client.delete(`/medical/medications/${id}`);
  }

  /**
   * Add medical condition
   */
  async addCondition(data: any): Promise<ApiResponse<any>> {
    return this.client.post('/medical/conditions', data);
  }

  /**
   * Update medical condition
   */
  async updateCondition(id: string, data: any): Promise<ApiResponse<any>> {
    return this.client.put(`/medical/conditions/${id}`, data);
  }

  /**
   * Delete medical condition
   */
  async deleteCondition(id: string): Promise<ApiResponse<void>> {
    return this.client.delete(`/medical/conditions/${id}`);
  }
}

/**
 * Device API endpoints
 */
export class DeviceApi {
  constructor(private client: ApiClient) {}

  /**
   * Get user devices
   */
  async getDevices(): Promise<ApiResponse<any[]>> {
    return this.client.get('/devices');
  }

  /**
   * Pair new device
   */
  async pairDevice(data: any): Promise<ApiResponse<any>> {
    return this.client.post('/devices/pair', data);
  }

  /**
   * Unpair device
   */
  async unpairDevice(id: string): Promise<ApiResponse<void>> {
    return this.client.delete(`/devices/${id}`);
  }

  /**
   * Update device settings
   */
  async updateDeviceSettings(id: string, settings: any): Promise<ApiResponse<any>> {
    return this.client.put(`/devices/${id}/settings`, settings);
  }

  /**
   * Get device status
   */
  async getDeviceStatus(id: string): Promise<ApiResponse<any>> {
    return this.client.get(`/devices/${id}/status`);
  }
}

/**
 * Communication API endpoints
 */
export class CommunicationApi {
  constructor(private client: ApiClient) {}

  /**
   * Send message in emergency
   */
  async sendMessage(emergencyId: string, message: any): Promise<ApiResponse<any>> {
    return this.client.post(`/communication/${emergencyId}/messages`, message);
  }

  /**
   * Get message history
   */
  async getMessages(emergencyId: string, params?: any): Promise<ApiResponse<any[]>> {
    return this.client.get(`/communication/${emergencyId}/messages`, params);
  }

  /**
   * Upload media
   */
  async uploadMedia(emergencyId: string, file: File): Promise<ApiResponse<any>> {
    return this.client.upload(`/communication/${emergencyId}/media`, file);
  }
}

/**
 * API client with all endpoints
 */
export class SosApiClient {
  public auth: AuthApi;
  public user: UserApi;
  public emergency: EmergencyApi;
  public location: LocationApi;
  public medical: MedicalApi;
  public device: DeviceApi;
  public communication: CommunicationApi;

  constructor(private client: ApiClient) {
    this.auth = new AuthApi(client);
    this.user = new UserApi(client);
    this.emergency = new EmergencyApi(client);
    this.location = new LocationApi(client);
    this.medical = new MedicalApi(client);
    this.device = new DeviceApi(client);
    this.communication = new CommunicationApi(client);
  }

  /**
   * Set authentication token
   */
  setToken(token: string): void {
    this.client.setToken(token);
  }

  /**
   * Clear authentication token
   */
  clearToken(): void {
    this.client.clearToken();
  }
}

/**
 * Create SOS API client
 */
export function createSosApiClient(client: ApiClient): SosApiClient {
  return new SosApiClient(client);
}
