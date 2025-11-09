/**
 * API Client for SOS App
 * Handles all communication with backend services through API Gateway
 */

const API_BASE_URL = 'http://localhost:3000/api/v1';

const apiClient = {
    // Get auth token from localStorage
    getAuthToken() {
        return localStorage.getItem('authToken');
    },

    // Get headers with auth token
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };

        const token = this.getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    },

    // Make HTTP request
    async request(method, endpoint, data = null) {
        try {
            const url = `${API_BASE_URL}${endpoint}`;
            const options = {
                method,
                headers: this.getHeaders(),
            };

            if (data && (method === 'POST' || method === 'PUT')) {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(url, options);
            const responseData = await response.json();

            if (!response.ok) {
                throw {
                    status: response.status,
                    message: responseData.message || 'Request failed',
                    data: responseData,
                };
            }

            return {
                status: response.status,
                data: responseData,
            };
        } catch (error) {
            console.error(`API Error (${method} ${endpoint}):`, error);
            throw error;
        }
    },

    // ==================== Authentication ====================

    async login(email, password) {
        return this.request('POST', '/auth/login', {
            email,
            password,
        });
    },

    async register(userData) {
        return this.request('POST', '/auth/register', userData);
    },

    async logout() {
        // Clear local storage
        localStorage.removeItem('authToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('userName');
    },

    // ==================== Emergency Services ====================

    async createEmergency(emergencyData) {
        return this.request('POST', '/emergencies', emergencyData);
    },

    async getEmergencies(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/emergencies?${queryString}` : '/emergencies';
        return this.request('GET', endpoint);
    },

    async getEmergency(emergencyId) {
        return this.request('GET', `/emergencies/${emergencyId}`);
    },

    async updateEmergencyStatus(emergencyId, status) {
        return this.request('PUT', `/emergencies/${emergencyId}/status`, {
            status,
        });
    },

    async cancelEmergency(emergencyId) {
        return this.request('PUT', `/emergencies/${emergencyId}/cancel`, {});
    },

    async resolveEmergency(emergencyId) {
        return this.request('PUT', `/emergencies/${emergencyId}/resolve`, {});
    },

    async getEmergencyTimeline(emergencyId) {
        return this.request('GET', `/emergencies/${emergencyId}/timeline`);
    },

    // ==================== User Services ====================

    async getUserProfile() {
        return this.request('GET', '/users/profile');
    },

    async updateUserProfile(profileData) {
        return this.request('PUT', '/users/profile', profileData);
    },

    // ==================== Contact Services ====================

    async addEmergencyContact(contactData) {
        return this.request('POST', '/users/emergency-contacts', contactData);
    },

    async getEmergencyContacts() {
        return this.request('GET', '/users/emergency-contacts');
    },

    async updateEmergencyContact(contactId, contactData) {
        return this.request('PUT', `/users/emergency-contacts/${contactId}`, contactData);
    },

    async deleteEmergencyContact(contactId) {
        return this.request('DELETE', `/users/emergency-contacts/${contactId}`);
    },

    // ==================== Medical Services ====================

    async getMedicalProfile() {
        return this.request('GET', '/medical/profile');
    },

    async updateMedicalProfile(medicalData) {
        return this.request('PUT', '/medical/profile', medicalData);
    },

    async addMedication(medicationData) {
        return this.request('POST', '/medical/medications', medicationData);
    },

    async getMedications() {
        return this.request('GET', '/medical/medications');
    },

    async addAllergy(allergyData) {
        return this.request('POST', '/medical/allergies', allergyData);
    },

    async getAllergies() {
        return this.request('GET', '/medical/allergies');
    },

    async addCondition(conditionData) {
        return this.request('POST', '/medical/conditions', conditionData);
    },

    async getConditions() {
        return this.request('GET', '/medical/conditions');
    },

    // ==================== Notification Services ====================

    async getNotifications() {
        return this.request('GET', '/notifications');
    },

    async markNotificationAsRead(notificationId) {
        return this.request('PUT', `/notifications/${notificationId}/read`, {});
    },

    // ==================== Location Services ====================

    async shareLocation(latitude, longitude) {
        return this.request('POST', '/location/share', {
            latitude,
            longitude,
            timestamp: new Date().toISOString(),
        });
    },

    async getLastLocation() {
        return this.request('GET', '/location/last');
    },

    // ==================== Communication Services ====================

    async sendMessage(recipientId, message) {
        return this.request('POST', '/messages', {
            recipientId,
            content: message,
        });
    },

    async getMessages(conversationId) {
        return this.request('GET', `/messages?conversationId=${conversationId}`);
    },

    async getConversations() {
        return this.request('GET', '/conversations');
    },

    // ==================== Health Check ====================

    async healthCheck() {
        try {
            const response = await fetch(`${API_BASE_URL}/health`);
            return response.ok;
        } catch {
            return false;
        }
    },
};
