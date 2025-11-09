# SOS App - Test Website

A local testing website for the SOS Emergency Response System. This web application allows you to test all backend services in a user-friendly interface.

## Features

### 🚨 Emergency Management
- **SOS Button**: Press and hold for 3 seconds to trigger an emergency alert
- **Emergency Status**: Real-time tracking of active emergencies
- **Emergency History**: View all past emergencies and their status
- **Emergency Details**: See location, type, severity, and timeline
- **Actions**: Cancel or resolve active emergencies

### 👥 Contact Management
- **Add Emergency Contacts**: Create contacts to be notified during emergencies
- **Contact Priority**: Set priority levels (Critical, High, Medium, Low)
- **Contact Information**: Store phone, email, and relationship details
- **Quick Access**: View and manage all emergency contacts

### 👤 User Profile
- **Profile Management**: View and edit personal information
- **Dashboard**: See statistics and quick overview
- **Real-time Updates**: Auto-refreshing data every 30 seconds

### 📱 Service Integration
- Authentication Service
- User Service
- Emergency Service
- Location Service
- Notification Service
- Communication Service
- Medical Service

## Setup & Installation

### Prerequisites
- Docker Desktop running with all SOS App services started
- Node.js (optional, for serving with a local server)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Step 1: Start Backend Services

```bash
cd /home/user/sos-app
./scripts/docker-up.sh
```

Wait for all services to start and be healthy (about 30 seconds).

### Step 2: Access the Website

**Option A: Direct File Opening**
1. Open `test-website/login.html` directly in your browser
2. Or use: `file:///home/user/sos-app/test-website/login.html`

**Option B: Local Server (Recommended for better functionality)**

Using Python 3:
```bash
cd /home/user/sos-app/test-website
python3 -m http.server 8000
```

Then open: http://localhost:8000/login.html

Using Node.js:
```bash
cd /home/user/sos-app/test-website
npx serve -s . -l 8000
```

Using http-server:
```bash
cd /home/user/sos-app/test-website
npx http-server -p 8000 .
```

## Usage

### Login / Register

**Demo Account:**
- Email: `demo@sosapp.com`
- Password: `demo123`

Or create a new account:
1. Click the "Register" tab
2. Fill in your details
3. Click "Create Account"
4. Login with your credentials

### Dashboard (Home)

The main dashboard shows:
- **Emergency Alert Section**: The SOS button and active emergency status
- **Quick Stats**: Active emergencies, resolved count, contact count
- **Recent Emergencies**: Latest emergency alerts

### Triggering an Emergency

1. Go to the Dashboard
2. Find the **EMERGENCY** button (large red circular button)
3. **Press and hold** the button for 3 seconds
4. A progress bar will show the hold progress
5. When you reach 100%, the emergency will be triggered
6. Your current location will be sent (if location services are enabled)

### Managing Emergencies

Once an emergency is triggered:
- **View Details**: See the emergency ID, type, status, and timestamp
- **Cancel Emergency**: Stops the active emergency alert
- **Mark as Resolved**: Marks the emergency as handled

### Adding Emergency Contacts

1. Click **"Contacts"** in the navigation
2. Click **"+ Add Contact"**
3. Fill in contact details:
   - Name (required)
   - Relationship (e.g., Doctor, Family)
   - Phone (required)
   - Email (optional)
   - Priority Level
4. Click **"Add Contact"**
5. Contacts will be notified during emergencies

### Viewing History

1. Click **"Emergencies"** in the navigation
2. View all past emergencies with their status
3. Click on an emergency to see more details

### Profile Management

1. Click **"Profile"** in the navigation
2. View your account information
3. Click **"Edit Profile"** to update details

## API Integration

The website communicates with the backend through the **API Gateway** at `http://localhost:3000/api/v1`.

### Endpoints Used

**Authentication:**
- `POST /auth/login` - User login
- `POST /auth/register` - User registration

**Emergencies:**
- `POST /emergencies` - Create emergency
- `GET /emergencies` - Get all emergencies
- `GET /emergencies/{id}` - Get specific emergency
- `PUT /emergencies/{id}/status` - Update status
- `PUT /emergencies/{id}/cancel` - Cancel emergency
- `PUT /emergencies/{id}/resolve` - Resolve emergency

**Contacts:**
- `POST /users/emergency-contacts` - Add contact
- `GET /users/emergency-contacts` - Get all contacts
- `DELETE /users/emergency-contacts/{id}` - Delete contact

**User:**
- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update user profile

## Features by Service

### 🔐 Auth Service
- User registration and login
- JWT token-based authentication
- Session management

### 👤 User Service
- User profile management
- Emergency contact management
- User preferences

### 🚨 Emergency Service
- Emergency alert creation
- Status tracking and updates
- Emergency timeline
- Location recording

### 📍 Location Service
- Real-time location tracking
- Location history
- Proximity-based services

### 📢 Notification Service
- Multi-channel notifications
- SMS, Email, Push notifications
- Notification preferences
- Escalation policies

### 💬 Communication Service
- Real-time messaging
- Group chat support
- Media sharing
- WebSocket integration

### 🏥 Medical Service
- Medical profile management
- Allergy tracking
- Medication records
- Medical history

## Testing Workflows

### Test 1: Basic Emergency Alert
1. Login with demo account
2. Press SOS button for 3 seconds
3. Verify emergency is created
4. View emergency in history
5. Resolve emergency

### Test 2: Contact Management
1. Go to Contacts page
2. Add a new contact (your phone number)
3. Verify contact appears in list
4. Trigger emergency
5. Verify contact would be notified

### Test 3: Location Sharing
1. Allow location access when prompted
2. Trigger emergency
3. Check emergency details for location data
4. Verify location is recorded

### Test 4: Real-time Updates
1. Open dashboard
2. In another tab/window, trigger emergency
3. Verify first tab auto-updates within 30 seconds
4. Check emergency appears in real-time

### Test 5: Emergency History
1. Trigger multiple emergencies over time
2. Navigate to Emergencies page
3. Verify all emergencies are listed
4. Check different statuses (active, resolved, cancelled)

## Troubleshooting

### Issue: Cannot connect to backend
**Solution:**
- Ensure Docker services are running: `docker ps`
- Verify API Gateway is running on port 3000
- Check network connectivity: Open browser console (F12) and look for fetch errors
- Try health check: http://localhost:3000/health

### Issue: Login fails
**Solution:**
- Verify auth service is running
- Check credentials are correct (demo@sosapp.com / demo123)
- Try creating a new account if demo account fails
- Check browser console for error details

### Issue: Emergency not created
**Solution:**
- Ensure emergency service is running
- Check you're holding the button for full 3 seconds
- Verify page is not showing loading spinner
- Check for error messages in toast notifications

### Issue: CORS errors in console
**Solution:**
- This is expected - backend needs CORS configuration update
- For testing, use a local HTTP server instead of file:// protocol
- Run: `python3 -m http.server 8000` in test-website directory

### Issue: Location not capturing
**Solution:**
- Browser may block location access - check address bar permissions
- Grant location access when prompted
- Not all browsers/OS support geolocation
- Fallback data will be used if location unavailable

### Issue: Auto-refresh not working
**Solution:**
- Ensure you're on the Dashboard page
- Check browser console for errors
- Refresh page manually if needed
- Auto-refresh occurs every 30 seconds

## Browser Compatibility

Tested on:
- ✅ Chrome/Chromium 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## Local Development

### File Structure
```
test-website/
├── login.html          # Login & registration page
├── index.html          # Main dashboard & app interface
├── styles.css          # All styling
├── api.js              # API client & HTTP requests
├── app.js              # Application logic & UI interactions
└── README.md           # This file
```

### API Client Usage

```javascript
// Authentication
apiClient.login(email, password)
apiClient.register(userData)

// Emergencies
apiClient.createEmergency(data)
apiClient.getEmergencies()
apiClient.cancelEmergency(id)
apiClient.resolveEmergency(id)

// Contacts
apiClient.addEmergencyContact(data)
apiClient.getEmergencyContacts()
apiClient.deleteEmergencyContact(id)
```

## Notes

- This is a testing/demo website - not for production use
- Demo account is for testing only
- Emergency alerts will be processed by the backend services
- All data is real and will be stored in the database
- Location data (if shared) is transmitted to location service

## Security Considerations

For testing purposes:
- Demo credentials are publicly visible
- JWT tokens are stored in localStorage (not secure in production)
- No CSRF protection in demo mode
- Use proper OAuth2 for production

## Support

For issues with the testing website:
1. Check the Troubleshooting section above
2. Review browser console (F12) for errors
3. Check backend service logs: `./scripts/docker-logs.sh`
4. Verify all services are running: `docker-compose ps`

## License

Part of the SOS App Emergency Response System
