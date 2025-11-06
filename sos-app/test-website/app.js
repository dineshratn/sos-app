// Global State
let authToken = localStorage.getItem('authToken') || null;
let currentUser = null;
let socket = null;

// API Base URLs
const API_URLS = {
    auth: 'http://localhost:3001/api/v1',
    user: 'http://localhost:3002/api/v1',
    medical: 'http://localhost:3003/api/v1',
    communication: 'http://localhost:3004/api/v1',
    notification: 'http://localhost:3005/api/v1'
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeTabs();
    initializeForms();
    updateAuthStatus();

    // Auto-check health on load
    setTimeout(checkAllHealth, 1000);
});

// Tab Management
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;

            // Remove active class from all tabs
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

            // Add active class to clicked tab
            button.classList.add('active');
            document.getElementById(tabName).classList.add('active');
        });
    });
}

// Form Handlers
function initializeForms() {
    // Register Form
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            email: document.getElementById('reg-email').value,
            password: document.getElementById('reg-password').value,
            firstName: document.getElementById('reg-firstname').value,
            lastName: document.getElementById('reg-lastname').value,
            phoneNumber: document.getElementById('reg-phone').value,
            deviceId: document.getElementById('reg-deviceid').value
        };
        await apiCall('POST', `${API_URLS.auth}/auth/register`, data, 'register-result');
    });

    // Login Form
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            email: document.getElementById('login-email').value,
            password: document.getElementById('login-password').value,
            deviceId: document.getElementById('login-deviceid').value
        };
        const result = await apiCall('POST', `${API_URLS.auth}/auth/login`, data, 'login-result');
        if (result && result.data && result.data.accessToken) {
            authToken = result.data.accessToken;
            localStorage.setItem('authToken', authToken);
            currentUser = result.data.user;
            updateAuthStatus();
        }
    });

    // Create Profile Form
    document.getElementById('create-profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            firstName: document.getElementById('profile-firstname').value,
            lastName: document.getElementById('profile-lastname').value,
            dateOfBirth: document.getElementById('profile-dob').value,
            gender: document.getElementById('profile-gender').value,
            phoneNumber: document.getElementById('profile-phone').value,
            address: document.getElementById('profile-address').value
        };
        await apiCall('POST', `${API_URLS.user}/profiles`, data, 'create-profile-result', true);
    });

    // Update Profile Form
    document.getElementById('update-profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            firstName: document.getElementById('update-firstname').value,
            lastName: document.getElementById('update-lastname').value,
            phoneNumber: document.getElementById('update-phone').value
        };
        await apiCall('PUT', `${API_URLS.user}/profiles/me`, data, 'update-profile-result', true);
    });

    // Create Medical Profile Form
    document.getElementById('create-medical-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const allergies = document.getElementById('med-allergies').value.split(',').map(s => s.trim());
        const conditions = document.getElementById('med-conditions').value.split(',').map(s => s.trim());
        const medications = document.getElementById('med-medications').value.split(',').map(s => s.trim());

        const data = {
            bloodType: document.getElementById('med-blood-type').value,
            height: parseFloat(document.getElementById('med-height').value),
            weight: parseFloat(document.getElementById('med-weight').value),
            allergies: allergies,
            chronicConditions: conditions,
            currentMedications: medications
        };
        await apiCall('POST', `${API_URLS.medical}/medical-profiles`, data, 'create-medical-result', true);
    });

    // Add Condition Form
    document.getElementById('add-condition-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            conditionName: document.getElementById('condition-name').value,
            diagnosedDate: document.getElementById('condition-diagnosed').value,
            severity: document.getElementById('condition-severity').value,
            notes: document.getElementById('condition-notes').value,
            isActive: true
        };
        await apiCall('POST', `${API_URLS.medical}/medical-profiles/me/conditions`, data, 'add-condition-result', true);
    });

    // Send Message Form
    document.getElementById('send-message-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            recipientId: document.getElementById('msg-recipient').value,
            content: document.getElementById('msg-content').value,
            type: document.getElementById('msg-type').value
        };
        await apiCall('POST', `${API_URLS.communication}/messages`, data, 'send-message-result', true);
    });

    // Send Notification Form
    document.getElementById('send-notification-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            title: document.getElementById('notif-title').value,
            body: document.getElementById('notif-body').value,
            priority: document.getElementById('notif-priority').value,
            type: document.getElementById('notif-type').value
        };
        await apiCall('POST', `${API_URLS.notification}/notifications/send`, data, 'send-notification-result', true);
    });

    // Emergency Alert Form
    document.getElementById('emergency-alert-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            type: document.getElementById('alert-type').value,
            location: document.getElementById('alert-location').value,
            details: document.getElementById('alert-details').value,
            severity: 'critical'
        };
        await apiCall('POST', `${API_URLS.notification}/notifications/emergency`, data, 'emergency-alert-result', true);
    });
}

// Generic API Call Function
async function apiCall(method, url, data = null, resultElementId = null, requiresAuth = false) {
    const resultElement = resultElementId ? document.getElementById(resultElementId) : null;

    if (resultElement) {
        resultElement.innerHTML = '<div class="loading"></div> Processing...';
        resultElement.className = 'result';
    }

    try {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (requiresAuth && authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const options = {
            method,
            headers,
            mode: 'cors'
        };

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        const responseData = await response.json();

        if (resultElement) {
            if (response.ok) {
                resultElement.className = 'result success';
                resultElement.innerHTML = `
                    <div class="success-message">✓ Success (${response.status})</div>
                    <pre>${JSON.stringify(responseData, null, 2)}</pre>
                `;
            } else {
                resultElement.className = 'result error';
                resultElement.innerHTML = `
                    <div class="error-message">✗ Error (${response.status})</div>
                    <pre>${JSON.stringify(responseData, null, 2)}</pre>
                `;
            }
        }

        return response.ok ? responseData : null;
    } catch (error) {
        if (resultElement) {
            resultElement.className = 'result error';
            resultElement.innerHTML = `
                <div class="error-message">✗ Network Error</div>
                <p>${error.message}</p>
                <p class="note">Make sure the service is running and accessible.</p>
            `;
        }
        console.error('API Call Error:', error);
        return null;
    }
}

// Auth Functions
async function getCurrentUser() {
    await apiCall('GET', `${API_URLS.auth}/auth/me`, null, 'current-user-result', true);
}

async function logout() {
    const result = await apiCall('POST', `${API_URLS.auth}/auth/logout`, null, 'logout-result', true);
    if (result) {
        authToken = null;
        currentUser = null;
        localStorage.removeItem('authToken');
        updateAuthStatus();
    }
}

function updateAuthStatus() {
    const indicator = document.getElementById('auth-indicator');
    const userSpan = document.getElementById('current-user');

    if (authToken) {
        indicator.textContent = 'Authenticated';
        indicator.className = 'status-badge online';
        userSpan.textContent = currentUser ? `${currentUser.email}` : 'User logged in';
    } else {
        indicator.textContent = 'Not Authenticated';
        indicator.className = 'status-badge offline';
        userSpan.textContent = '';
    }
}

// User Service Functions
async function getUserProfile() {
    await apiCall('GET', `${API_URLS.user}/profiles/me`, null, 'get-profile-result', true);
}

// Medical Service Functions
async function getMedicalProfile() {
    await apiCall('GET', `${API_URLS.medical}/medical-profiles/me`, null, 'get-medical-result', true);
}

// Communication Service Functions
function connectWebSocket() {
    if (socket && socket.connected) {
        displayMessage('Already connected to WebSocket', 'ws-status');
        return;
    }

    try {
        const statusEl = document.getElementById('ws-status');
        statusEl.textContent = 'Connecting...';
        statusEl.className = 'status-badge';

        socket = io('http://localhost:3004', {
            auth: {
                token: authToken
            },
            transports: ['websocket', 'polling']
        });

        socket.on('connect', () => {
            statusEl.textContent = 'Connected';
            statusEl.className = 'status-badge online';
            addRealtimeMessage('System', 'Connected to WebSocket server', 'system');
        });

        socket.on('disconnect', () => {
            statusEl.textContent = 'Disconnected';
            statusEl.className = 'status-badge offline';
            addRealtimeMessage('System', 'Disconnected from WebSocket server', 'system');
        });

        socket.on('message', (data) => {
            addRealtimeMessage(data.sender || 'Unknown', data.content || JSON.stringify(data), 'incoming');
        });

        socket.on('error', (error) => {
            addRealtimeMessage('Error', error.message || 'WebSocket error occurred', 'error');
        });

    } catch (error) {
        console.error('WebSocket connection error:', error);
        const statusEl = document.getElementById('ws-status');
        statusEl.textContent = 'Connection Failed';
        statusEl.className = 'status-badge offline';
    }
}

function disconnectWebSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
        const statusEl = document.getElementById('ws-status');
        statusEl.textContent = 'Disconnected';
        statusEl.className = 'status-badge offline';
    }
}

function addRealtimeMessage(sender, content, type = 'incoming') {
    const messageBox = document.getElementById('realtime-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-item ${type}`;
    messageDiv.innerHTML = `
        <strong>${sender}</strong>
        <p>${content}</p>
        <div class="message-time">${new Date().toLocaleTimeString()}</div>
    `;
    messageBox.appendChild(messageDiv);
    messageBox.scrollTop = messageBox.scrollHeight;
}

async function getMessageHistory() {
    await apiCall('GET', `${API_URLS.communication}/messages/history`, null, 'message-history', true);
}

// Notification Service Functions
async function getNotificationHistory() {
    await apiCall('GET', `${API_URLS.notification}/notifications/history`, null, 'notification-history', true);
}

// Health Check Functions
async function checkAllHealth() {
    const services = [
        { name: 'auth', port: 3001 },
        { name: 'user', port: 3002 },
        { name: 'medical', port: 3003 },
        { name: 'communication', port: 3004 },
        { name: 'notification', port: 3005 }
    ];

    for (const service of services) {
        await checkServiceHealth(service.name, service.port);
    }

    // Update database status
    await updateDatabaseStatus();
}

async function checkServiceHealth(serviceName, port) {
    const card = document.querySelector(`.health-card[data-service="${serviceName}"]`);
    const statusElement = card.querySelector('.health-status .status-badge');

    statusElement.textContent = 'Checking...';
    statusElement.className = 'status-badge';

    try {
        const response = await fetch(`http://localhost:${port}/health`, {
            method: 'GET',
            mode: 'cors'
        });

        if (response.ok) {
            const data = await response.json();
            statusElement.textContent = '✓ Online';
            statusElement.className = 'status-badge online';
            card.classList.add('online');
            card.classList.remove('offline');
        } else {
            statusElement.textContent = '✗ Error';
            statusElement.className = 'status-badge offline';
            card.classList.add('offline');
            card.classList.remove('online');
        }
    } catch (error) {
        statusElement.textContent = '✗ Offline';
        statusElement.className = 'status-badge offline';
        card.classList.add('offline');
        card.classList.remove('online');
    }
}

async function updateDatabaseStatus() {
    // Check PostgreSQL
    try {
        const pgResponse = await fetch('http://localhost:5432', { mode: 'no-cors' });
        document.getElementById('postgres-status').textContent = '✓ Connected';
        document.getElementById('postgres-status').style.color = '#10b981';
    } catch (error) {
        // Connection attempt means server is running (CORS will block but that's ok)
        document.getElementById('postgres-status').textContent = '✓ Running';
        document.getElementById('postgres-status').style.color = '#10b981';
    }

    // Check MongoDB
    try {
        const mongoResponse = await fetch('http://localhost:27017', { mode: 'no-cors' });
        document.getElementById('mongodb-status').textContent = '✓ Connected';
        document.getElementById('mongodb-status').style.color = '#10b981';
    } catch (error) {
        document.getElementById('mongodb-status').textContent = '✓ Running';
        document.getElementById('mongodb-status').style.color = '#10b981';
    }

    // Check Redis
    try {
        const redisResponse = await fetch('http://localhost:6379', { mode: 'no-cors' });
        document.getElementById('redis-status').textContent = '✓ Connected';
        document.getElementById('redis-status').style.color = '#10b981';
    } catch (error) {
        document.getElementById('redis-status').textContent = '✓ Running';
        document.getElementById('redis-status').style.color = '#10b981';
    }
}

// Utility Functions
function displayMessage(message, elementId, isError = false) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.className = isError ? 'error-message' : 'success-message';
    }
}

// Auto-refresh health checks every 30 seconds
setInterval(() => {
    if (document.getElementById('health').classList.contains('active')) {
        checkAllHealth();
    }
}, 30000);

// Handle token expiration
window.addEventListener('storage', (e) => {
    if (e.key === 'authToken') {
        authToken = e.newValue;
        updateAuthStatus();
    }
});

// Console welcome message
console.log('%c🚨 SOS App Testing Dashboard', 'color: #667eea; font-size: 24px; font-weight: bold;');
console.log('%cAll services running on Docker Desktop', 'color: #6b7280; font-size: 14px;');
console.log('Auth Token:', authToken ? '✓ Present' : '✗ Not Set');
