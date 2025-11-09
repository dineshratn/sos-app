# SOS App - Service Testing Dashboard

A comprehensive web-based testing interface for all SOS App microservices running on Docker Desktop.

## Quick Start

1. **Ensure all services are running:**
   ```bash
   cd /home/dinesh/sos-app-new/sos-app/sos-app
   docker-compose -f docker-compose.dev.yml ps
   ```

2. **Open the test website:**
   ```bash
   # Option 1: Open directly in browser
   open test-website/index.html
   # or
   xdg-open test-website/index.html

   # Option 2: Use a simple HTTP server (recommended)
   cd test-website
   python3 -m http.server 8000
   # Then open http://localhost:8000 in your browser
   ```

3. **Start testing!**
   - Navigate through tabs to test different services
   - Pre-filled forms make testing quick and easy
   - All responses are displayed in formatted JSON

## Features

### 🔐 Auth Service Testing
- **User Registration**: Create new test accounts with sample data
- **Login/Logout**: Authenticate and manage sessions
- **JWT Token Management**: Automatic token storage and usage
- **Profile Management**: View current authenticated user

**Pre-filled Test Data:**
- Email: `test@example.com`
- Password: `Test123!@#`
- Name: Test User
- Phone: +1234567890

### 👤 User Service Testing
- **Create Profile**: Set up user profiles with personal information
- **View Profile**: Retrieve profile data for authenticated user
- **Update Profile**: Modify existing profile information

**Sample Profile Data:**
- Name: John Doe
- DOB: 1990-01-01
- Gender: Male/Female/Other
- Address: 123 Main St, City, State

### 🏥 Medical Service Testing (HIPAA Compliant)
- **Medical Profile Management**: Create and view medical records
- **Condition Tracking**: Add chronic conditions and diagnoses
- **Medication Lists**: Track current medications
- **Allergy Management**: Record allergies and sensitivities

**Sample Medical Data:**
- Blood Type: A+, B+, O+, AB+, etc.
- Height/Weight: Metric measurements
- Allergies: Penicillin, Peanuts
- Conditions: Hypertension, Diabetes
- Medications: Metformin, Lisinopril

### 💬 Communication Service Testing
- **WebSocket Connection**: Real-time bidirectional communication
- **Send Messages**: Text, Alert, and Emergency messages
- **Message History**: View past conversations
- **Real-time Updates**: Live message feed

**WebSocket Features:**
- Auto-reconnect on disconnect
- Connection status indicator
- Real-time message display
- Socket.IO integration

### 🔔 Notification Service Testing
- **Push Notifications**: Test FCM (Android) and APNs (iOS)
- **Email Notifications**: Send test emails
- **SMS Alerts**: Test Twilio integration
- **Emergency Alerts**: Send critical notifications
- **Priority Levels**: Normal, High, Urgent

**Sample Notification:**
- Title: Test Notification
- Body: This is a test message
- Priority: High
- Type: FCM/APNs/Email/SMS

### ❤️ Health Check Monitoring
- **Service Status**: Check all microservices at once
- **Auto-refresh**: Health checks every 30 seconds
- **Visual Indicators**: Green (online) / Red (offline)
- **Database Status**: PostgreSQL, MongoDB, Redis

## Service Endpoints

| Service | Base URL | Port | Health Check |
|---------|----------|------|--------------|
| Auth | http://localhost:3001/api/v1 | 3001 | /health |
| User | http://localhost:3002/api/v1 | 3002 | /health |
| Medical | http://localhost:3003/api/v1 | 3003 | /health |
| Communication | http://localhost:3004/api/v1 | 3004 | /health |
| Notification | http://localhost:3005/api/v1 | 3005 | /health |

## Usage Guide

### Step-by-Step Testing Workflow

#### 1. Authentication Flow
```
1. Go to "Auth Service" tab
2. Click "Register" with pre-filled data
3. Click "Login" (uses same credentials)
4. Check auth status indicator turns green
5. Token is automatically saved for subsequent requests
```

#### 2. Create User Profile
```
1. Go to "User Service" tab
2. Ensure you're authenticated (green badge in header)
3. Fill in "Create User Profile" form
4. Click "Create Profile"
5. View profile with "Get My Profile" button
```

#### 3. Add Medical Information
```
1. Go to "Medical Service" tab
2. Select blood type and enter health data
3. Click "Create Medical Profile"
4. Add conditions using "Add Medical Condition"
5. Retrieve with "Get My Medical Profile"
```

#### 4. Test Real-time Communication
```
1. Go to "Communication" tab
2. Click "Connect WebSocket"
3. Wait for green "Connected" status
4. Send test messages
5. Watch real-time message feed
```

#### 5. Send Notifications
```
1. Go to "Notifications" tab
2. Fill in notification details
3. Select delivery method (FCM/APNs/Email/SMS)
4. Click "Send Notification"
5. Check notification history
```

#### 6. Monitor Health
```
1. Go to "Health Checks" tab
2. Click "Check All Services"
3. View status of each service
4. Auto-refresh enabled
```

## Authentication

The dashboard automatically manages JWT tokens:

- **Login**: Token saved to localStorage
- **Auto-attach**: Token included in Authorization header
- **Logout**: Token cleared from storage
- **Persistence**: Token survives page refresh
- **Expiration**: Automatic cleanup on logout

## CORS Configuration

All services must have CORS enabled for `http://localhost:8000` (or your server port):

```javascript
// Already configured in services
cors({
  origin: 'http://localhost:8000',
  credentials: true
})
```

If using a different port, update in `app.js`:
```javascript
const API_URLS = {
    auth: 'http://localhost:3001/api/v1',
    // ... other URLs
};
```

## Troubleshooting

### Services Not Responding

**Check if containers are running:**
```bash
docker ps --filter "name=sos-"
```

**Restart a service:**
```bash
docker restart sos-auth-service
```

**View service logs:**
```bash
docker logs sos-auth-service -f
```

### CORS Errors

If you see CORS errors in browser console:

1. Ensure services are running with CORS enabled
2. Check service environment variables have correct CORS_ORIGIN
3. Use `python3 -m http.server` instead of opening HTML directly
4. Try different port: `python3 -m http.server 9000`

### WebSocket Connection Failed

**Check communication service:**
```bash
docker logs sos-communication-service -f
```

**Verify Socket.IO:**
- Ensure Socket.IO library loads (check browser console)
- Check WebSocket port is accessible
- Verify auth token is valid

### Authentication Issues

**Token not working:**
1. Click "Logout" in Auth tab
2. Click "Login" again
3. Check browser localStorage: `localStorage.getItem('authToken')`

**Clear stored data:**
```javascript
// In browser console
localStorage.clear();
```

### API Calls Failing

**Check network tab:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Make API call
4. Check request/response details

**Common issues:**
- Service not running
- Wrong port number
- Invalid JSON in request
- Missing authentication token

## Browser Compatibility

Tested and working on:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

**Requirements:**
- JavaScript enabled
- LocalStorage enabled
- WebSocket support (for Communication service)

## Development

### File Structure
```
test-website/
├── index.html          # Main HTML interface
├── styles.css          # Styling and responsive design
├── app.js             # API calls and WebSocket logic
└── README.md          # This file
```

### Customization

**Add new API endpoint:**
```javascript
// In app.js
async function myNewFunction() {
    await apiCall('POST', `${API_URLS.user}/my-endpoint`,
        { data: 'value' },
        'result-element-id',
        true  // requires auth
    );
}
```

**Add new test section:**
```html
<!-- In index.html -->
<div class="test-section">
    <h3>My New Test</h3>
    <button class="btn btn-primary" onclick="myNewFunction()">
        Test New Feature
    </button>
    <div id="result-element-id" class="result"></div>
</div>
```

### API Response Format

All API calls display responses in this format:

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Security Notes

⚠️ **This is a testing interface - DO NOT use in production**

**Security considerations:**
- All test data is visible in browser
- Tokens stored in localStorage (not secure)
- No encryption on API calls (HTTP not HTTPS)
- CORS wide open for testing
- No rate limiting
- Debug information exposed

**Production requirements:**
- HTTPS for all connections
- Secure token storage
- Rate limiting
- Input validation
- Error message sanitization
- Remove test interface

## Features Roadmap

Planned additions:
- [ ] Batch testing scenarios
- [ ] API response time tracking
- [ ] Save/load test configurations
- [ ] Export test results
- [ ] Mock data generator
- [ ] Performance benchmarking
- [ ] Request history
- [ ] Dark mode toggle

## Support

For issues or questions:
1. Check service logs: `docker logs <service-name>`
2. Verify services running: `docker ps --filter "name=sos-"`
3. Review deployment docs: `DEPLOYMENT_UPDATE_2025-11-06.md`
4. Check browser console for JavaScript errors

## License

This testing dashboard is part of the SOS App project and follows the same license.

---

**Version:** 1.0.0
**Last Updated:** November 6, 2025
**Services Tested:** 5 (Auth, User, Medical, Communication, Notification)
