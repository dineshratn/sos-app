/**
 * SOS App - Main Application Logic
 * Handles UI interactions, page navigation, and service integration
 */

let currentUser = null;
let activeEmergency = null;
let sosHoldTimer = null;
let sosProgress = 0;

// Initialize app on page load
window.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    // Check if user is logged in
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Load user data
    await loadUserData();

    // Setup event listeners
    setupEventListeners();

    // Load initial data
    await loadDashboardData();

    // Check API health
    checkAPIHealth();

    // Setup page navigation
    setupPageNavigation();
}

async function loadUserData() {
    try {
        const response = await apiClient.getUserProfile();
        currentUser = response.data;
        document.getElementById('user-name').textContent = currentUser.name || currentUser.email;
        document.getElementById('profile-name').textContent = currentUser.name || currentUser.email;
        document.getElementById('profile-email').textContent = currentUser.email;
    } catch (error) {
        console.error('Failed to load user data:', error);
        showToast('Failed to load user profile', 'error');
    }
}

async function loadDashboardData() {
    try {
        // Load emergencies
        const emergenciesResponse = await apiClient.getEmergencies({ limit: 10 });
        const emergencies = emergenciesResponse.data || [];

        // Update stats
        const activeCount = emergencies.filter(e => e.status === 'active').length;
        const resolvedCount = emergencies.filter(e => e.status === 'resolved').length;
        document.getElementById('stat-active').textContent = activeCount;
        document.getElementById('stat-resolved').textContent = resolvedCount;

        // Load and display emergencies
        displayRecentEmergencies(emergencies);
        displayAllEmergencies(emergencies);

        // Set active emergency if exists
        const active = emergencies.find(e => e.status === 'active');
        if (active) {
            activeEmergency = active;
            displayActiveEmergency(active);
        }

        // Load contacts
        const contactsResponse = await apiClient.getEmergencyContacts();
        const contacts = contactsResponse.data || [];
        document.getElementById('stat-contacts').textContent = contacts.length;
        displayContacts(contacts);
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
    }
}

function setupEventListeners() {
    // SOS Button
    const sosBtn = document.getElementById('sos-btn');
    sosBtn.addEventListener('mousedown', startSOSHold);
    sosBtn.addEventListener('mouseup', cancelSOSHold);
    sosBtn.addEventListener('mouseleave', cancelSOSHold);
    sosBtn.addEventListener('touchstart', startSOSHold);
    sosBtn.addEventListener('touchend', cancelSOSHold);

    // Emergency Actions
    document.getElementById('cancel-emergency-btn').addEventListener('click', cancelActiveEmergency);
    document.getElementById('resolve-emergency-btn').addEventListener('click', resolveActiveEmergency);

    // Contact Management
    document.getElementById('add-contact-btn').addEventListener('click', openAddContactModal);

    // Logout
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
}

function setupPageNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.id !== 'logout-btn') {
                e.preventDefault();
                const page = link.getAttribute('href').replace('#', '');
                showPage(page);

                // Update active link
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            }
        });
    });
}

// ==================== SOS Button Logic ====================

function startSOSHold(e) {
    e.preventDefault();
    sosProgress = 0;
    const progressDiv = document.getElementById('sos-progress');
    progressDiv.style.display = 'flex';

    sosHoldTimer = setInterval(() => {
        sosProgress += (100 / 30); // 3 seconds = 30 intervals of 100ms
        const progressBar = document.getElementById('sos-progress-bar');
        const progressText = document.getElementById('sos-progress-text');

        progressBar.style.width = Math.min(sosProgress, 100) + '%';
        progressText.textContent = Math.floor(Math.min(sosProgress, 100)) + '%';

        if (sosProgress >= 100) {
            clearInterval(sosHoldTimer);
            triggerEmergency();
        }
    }, 100);
}

function cancelSOSHold(e) {
    e.preventDefault();
    if (sosHoldTimer) {
        clearInterval(sosHoldTimer);
        sosHoldTimer = null;
    }
    const progressDiv = document.getElementById('sos-progress');
    progressDiv.style.display = 'none';
    sosProgress = 0;
}

async function triggerEmergency() {
    try {
        const progressDiv = document.getElementById('sos-progress');
        progressDiv.style.display = 'none';

        showSpinner(true);

        // Get user's current location if available
        let location = {};
        if (navigator.geolocation) {
            try {
                location = await new Promise((resolve) => {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            resolve({
                                latitude: pos.coords.latitude,
                                longitude: pos.coords.longitude,
                            });
                        },
                        () => resolve({}),
                        { timeout: 5000 }
                    );
                });
            } catch (e) {
                console.warn('Could not get location:', e);
            }
        }

        const emergencyData = {
            type: 'medical',
            description: 'Emergency alert triggered',
            severity: 'high',
            location: location,
        };

        const response = await apiClient.createEmergency(emergencyData);

        if (response.data) {
            activeEmergency = response.data;
            displayActiveEmergency(activeEmergency);
            showToast('🚨 Emergency alert triggered! Emergency services notified.', 'warning');

            // Reload emergencies
            await loadDashboardData();
        }
    } catch (error) {
        console.error('Failed to create emergency:', error);
        showToast('Failed to trigger emergency. Please try again.', 'error');
    } finally {
        showSpinner(false);
    }
}

async function cancelActiveEmergency() {
    if (!activeEmergency) return;

    if (!confirm('Are you sure you want to cancel this emergency?')) {
        return;
    }

    try {
        showSpinner(true);
        await apiClient.cancelEmergency(activeEmergency.id);

        activeEmergency = null;
        document.getElementById('active-emergency').style.display = 'none';
        showToast('Emergency cancelled', 'success');

        // Reload data
        await loadDashboardData();
    } catch (error) {
        console.error('Failed to cancel emergency:', error);
        showToast('Failed to cancel emergency', 'error');
    } finally {
        showSpinner(false);
    }
}

async function resolveActiveEmergency() {
    if (!activeEmergency) return;

    try {
        showSpinner(true);
        await apiClient.resolveEmergency(activeEmergency.id);

        activeEmergency = null;
        document.getElementById('active-emergency').style.display = 'none';
        showToast('Emergency marked as resolved', 'success');

        // Reload data
        await loadDashboardData();
    } catch (error) {
        console.error('Failed to resolve emergency:', error);
        showToast('Failed to resolve emergency', 'error');
    } finally {
        showSpinner(false);
    }
}

// ==================== Display Functions ====================

function displayActiveEmergency(emergency) {
    const container = document.getElementById('active-emergency');
    const details = document.getElementById('emergency-details');

    const statusBadge = `<span class="emergency-status status-${emergency.status.toLowerCase()}">${emergency.status.toUpperCase()}</span>`;

    const html = `
        <strong>Emergency ID:</strong> ${emergency.id}<br>
        <strong>Type:</strong> ${emergency.type || 'Unknown'}<br>
        <strong>Status:</strong> ${statusBadge}<br>
        <strong>Created:</strong> ${new Date(emergency.createdAt).toLocaleString()}<br>
        ${emergency.location ? `<strong>Location:</strong> ${emergency.location.latitude}, ${emergency.location.longitude}` : ''}
    `;

    details.innerHTML = html;
    container.style.display = 'block';

    const statusText = document.getElementById('emergency-status');
    statusText.textContent = '🚨 ACTIVE EMERGENCY - Emergency services notified';
    statusText.style.color = 'var(--danger)';
}

function displayRecentEmergencies(emergencies) {
    const container = document.getElementById('recent-emergencies');

    if (!emergencies || emergencies.length === 0) {
        container.innerHTML = '<p class="empty-state">No emergencies yet</p>';
        return;
    }

    const recentEmergencies = emergencies.slice(0, 5);
    const html = recentEmergencies.map(emergency => `
        <div class="emergency-item">
            <div class="emergency-item-info">
                <h3>${emergency.type || 'Emergency'}</h3>
                <p>${emergency.description || 'No description'}</p>
                <p style="font-size: 12px; color: #9ca3af;">
                    ${new Date(emergency.createdAt).toLocaleString()}
                </p>
            </div>
            <span class="emergency-status status-${emergency.status.toLowerCase()}">
                ${emergency.status.toUpperCase()}
            </span>
        </div>
    `).join('');

    container.innerHTML = html;
}

function displayAllEmergencies(emergencies) {
    const container = document.getElementById('emergencies-container');

    if (!emergencies || emergencies.length === 0) {
        container.innerHTML = '<p class="empty-state">No emergencies to display</p>';
        return;
    }

    const html = emergencies.map(emergency => `
        <div class="emergency-item">
            <div class="emergency-item-info">
                <h3>${emergency.type || 'Emergency'}</h3>
                <p>${emergency.description || 'No description'}</p>
                <p style="font-size: 12px; color: #9ca3af;">
                    ID: ${emergency.id}<br>
                    ${new Date(emergency.createdAt).toLocaleString()}
                </p>
            </div>
            <span class="emergency-status status-${emergency.status.toLowerCase()}">
                ${emergency.status.toUpperCase()}
            </span>
        </div>
    `).join('');

    container.innerHTML = html;
}

function displayContacts(contacts) {
    const container = document.getElementById('contacts-container');

    if (!contacts || contacts.length === 0) {
        container.innerHTML = '<p class="empty-state">No emergency contacts yet</p>';
        return;
    }

    const html = contacts.map(contact => `
        <div class="contact-item">
            <div class="emergency-item-info">
                <h3>${contact.name}</h3>
                <p>${contact.relationship || 'Contact'}</p>
                <p style="font-size: 12px; color: #9ca3af;">
                    📱 ${contact.phone}<br>
                    ${contact.email ? `📧 ${contact.email}` : ''}
                </p>
            </div>
            <div>
                <button class="btn btn-danger" onclick="deleteContact('${contact.id}')">Delete</button>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

// ==================== Contact Management ====================

function openAddContactModal() {
    document.getElementById('add-contact-modal').style.display = 'flex';
}

function closeAddContactModal() {
    document.getElementById('add-contact-modal').style.display = 'none';
    document.getElementById('add-contact-form').reset();
}

async function addContact(event) {
    event.preventDefault();

    const contactData = {
        name: document.getElementById('contact-name').value,
        relationship: document.getElementById('contact-relationship').value,
        phone: document.getElementById('contact-phone').value,
        email: document.getElementById('contact-email').value,
        priority: parseInt(document.getElementById('contact-priority').value),
    };

    try {
        showSpinner(true);
        await apiClient.addEmergencyContact(contactData);

        showToast('Emergency contact added successfully', 'success');
        closeAddContactModal();

        // Reload contacts
        const contactsResponse = await apiClient.getEmergencyContacts();
        displayContacts(contactsResponse.data || []);
    } catch (error) {
        console.error('Failed to add contact:', error);
        showToast('Failed to add emergency contact', 'error');
    } finally {
        showSpinner(false);
    }
}

async function deleteContact(contactId) {
    if (!confirm('Are you sure you want to delete this contact?')) {
        return;
    }

    try {
        showSpinner(true);
        await apiClient.deleteEmergencyContact(contactId);

        showToast('Contact deleted successfully', 'success');

        // Reload contacts
        const contactsResponse = await apiClient.getEmergencyContacts();
        displayContacts(contactsResponse.data || []);
    } catch (error) {
        console.error('Failed to delete contact:', error);
        showToast('Failed to delete contact', 'error');
    } finally {
        showSpinner(false);
    }
}

// ==================== Page Navigation ====================

function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Show selected page
    const pageId = pageName + '-page';
    const page = document.getElementById(pageId);
    if (page) {
        page.classList.add('active');
    }
}

// ==================== Utilities ====================

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showSpinner(show) {
    document.getElementById('loading-spinner').style.display = show ? 'flex' : 'none';
}

async function checkAPIHealth() {
    try {
        const isHealthy = await apiClient.healthCheck();
        if (!isHealthy) {
            showToast('⚠️ API Server may not be running. Please start Docker services.', 'warning');
        }
    } catch (error) {
        console.warn('API health check failed:', error);
    }
}

async function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        await apiClient.logout();
        window.location.href = 'login.html';
    }
}

// Auto-refresh data every 30 seconds
setInterval(async () => {
    if (document.getElementById('dashboard-page').classList.contains('active')) {
        try {
            const emergenciesResponse = await apiClient.getEmergencies({ limit: 10 });
            const emergencies = emergenciesResponse.data || [];
            displayRecentEmergencies(emergencies);

            const active = emergencies.find(e => e.status === 'active');
            if (active) {
                activeEmergency = active;
                displayActiveEmergency(active);
            } else if (activeEmergency) {
                activeEmergency = null;
                document.getElementById('active-emergency').style.display = 'none';
            }
        } catch (error) {
            console.error('Auto-refresh failed:', error);
        }
    }
}, 30000);
