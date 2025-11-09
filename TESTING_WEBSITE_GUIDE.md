# SOS App Testing Website - Quick Start Guide

Welcome to the SOS App testing website! This guide will help you get started with testing all the backend services through a user-friendly web interface.

## 🚀 Quick Start (5 minutes)

### Step 1: Start the Backend Services

```bash
cd /home/user/sos-app
./scripts/docker-up.sh
```

**Wait for output:**
```
✅ All services started!

📡 Service URLs:
   🌐 API Gateway: http://localhost:3000
   ...
```

### Step 2: Open the Testing Website

**Option A: Quick File Opening**
```bash
# Just open the login page directly
open /home/user/sos-app/test-website/login.html
# Or on Linux:
xdg-open /home/user/sos-app/test-website/login.html
# Or on WSL:
explorer.exe /home/user/sos-app/test-website/login.html
```

**Option B: Recommended - Use Local Server**

```bash
cd /home/user/sos-app/test-website
python3 -m http.server 8000
```

Then open: **http://localhost:8000/login.html**

### Step 3: Login

Use the demo account:
- **Email:** `demo@sosapp.com`
- **Password:** `demo123`

Or create a new account.

### Step 4: Test the SOS Button

1. You're now on the **Dashboard**
2. Find the big red **EMERGENCY** button
3. **Press and hold** it for 3 seconds
4. Watch the progress bar fill up
5. When it reaches 100%, the emergency is triggered! 🚨

### Step 5: Verify Emergency Was Created

- Check the "Active Emergency" section below the button
- Go to the "Emergencies" tab to see your emergency history
- See your emergency contact in the "Contacts" tab

## 📚 Complete Feature Guide

### Dashboard Features

#### SOS Button
- Press and hold for exactly 3 seconds
- Progress bar shows hold duration
- Captures your current location (if enabled)
- Creates emergency alert in system
- Notifies emergency contacts

#### Emergency Status
- **Active:** Emergency is currently being handled
- **Resolved:** Emergency has been resolved
- **Cancelled:** Emergency was cancelled

#### Quick Stats
Shows at a glance:
- Active emergencies count
- Resolved emergencies today
- Your emergency contacts count
- Average response time

#### Recent Emergencies
- Last 5 emergencies
- Color-coded status
- Quick view of type and timing

### Emergencies Tab

View complete emergency history:
- Full details of each emergency
- Current status
- Creation timestamp
- Emergency ID for reference

### Contacts Tab

Manage emergency contacts:
- **Add Contact**: Emergency contacts to notify
- **Contact Info**: Name, phone, email, relationship
- **Priority**: Critical, High, Medium, Low
- **Delete**: Remove contacts you no longer need

### Profile Tab

View your account:
- Full name
- Email address
- Account information
- Edit button for updates

## 🔑 Demo Accounts

### Default Demo Account
- Email: `demo@sosapp.com`
- Password: `demo123`

### Create New Test Account
1. Click "Register" tab
2. Fill in:
   - Full Name
   - Email address
   - Phone number
   - Password (min 8 chars recommended)
3. Click "Create Account"
4. Login with your credentials

## 🧪 Testing Scenarios

### Scenario 1: Basic Emergency Alert (2 minutes)
**Objective:** Trigger and manage an emergency

```
1. Login with demo account
2. Press SOS button for 3 seconds
3. Wait for emergency to be created
4. View emergency details in "Active Emergency" section
5. Click "Mark as Resolved"
6. Verify emergency appears in history as "RESOLVED"
```

**What to check:**
- ✅ Emergency created successfully
- ✅ Emergency ID generated
- ✅ Timestamp recorded
- ✅ Status transitions work

### Scenario 2: Emergency Contacts (3 minutes)
**Objective:** Add and manage emergency contacts

```
1. Click "Contacts" tab
2. Click "+ Add Contact"
3. Fill in:
   - Name: Your Name
   - Relationship: Friend
   - Phone: Your Phone Number
   - Email: Your Email
   - Priority: High
4. Click "Add Contact"
5. Verify contact appears in list
6. Click "Delete" to remove (if testing)
```

**What to check:**
- ✅ Contact form validates
- ✅ Contact added successfully
- ✅ Contact appears in list
- ✅ Contact can be deleted

### Scenario 3: Location Sharing (3 minutes)
**Objective:** Test location capture during emergency

```
1. Browser will prompt "Allow location?"
2. Click "Allow" or "Allow once"
3. Go to Dashboard
4. Press SOS button for 3 seconds
5. Check "Active Emergency" section
6. Look for location data
```

**What to check:**
- ✅ Location permission requested
- ✅ Location captured (latitude/longitude)
- ✅ Location appears in emergency details
- ✅ Fallback works if location denied

### Scenario 4: Real-time Updates (5 minutes)
**Objective:** Test auto-refresh and real-time updates

```
1. Open Dashboard in two browser windows/tabs
2. In first window: Trigger emergency with SOS button
3. In second window: Watch for automatic update
4. Within 30 seconds, emergency should appear
5. Cancel emergency in first window
6. Within 30 seconds, status should update in second window
```

**What to check:**
- ✅ Auto-refresh works every 30 seconds
- ✅ Data syncs between windows
- ✅ Status changes reflect in real-time
- ✅ New emergencies appear immediately

### Scenario 5: Error Handling (3 minutes)
**Objective:** Test error scenarios

```
1. Stop Docker services: ./scripts/docker-down.sh
2. Try to trigger emergency
3. Should see error message
4. Restart services: ./scripts/docker-up.sh
5. Retry - should work
```

**What to check:**
- ✅ Error messages are clear
- ✅ App doesn't crash
- ✅ Can retry after services recover
- ✅ Warning displayed about API

### Scenario 6: Authentication (2 minutes)
**Objective:** Test login/logout flow

```
1. Create new account (register)
2. Logout using top-right menu
3. Login with new account
4. Verify you see your data
5. Logout and verify redirect to login
```

**What to check:**
- ✅ Registration validates input
- ✅ Password confirmation works
- ✅ Login with correct credentials works
- ✅ Logout clears session
- ✅ Tokens stored properly

## 🔧 Advanced Testing

### Test with Different Devices

**Mobile:**
```bash
# On your phone, access:
http://<your-computer-ip>:8000/login.html
# Example: http://192.168.1.100:8000/login.html
```

**Tablet:**
Same as mobile - responsive design adapts automatically

### Test Performance

**Open Browser DevTools (F12):**
1. Go to Network tab
2. Trigger emergency
3. Watch API calls
4. Check response times
5. Verify all endpoints hit

**Network Requests Expected:**
- `POST /api/v1/emergencies` (Create)
- `GET /api/v1/emergencies` (List)
- Any location sharing calls

### Test Different Browsers

Test website on:
- Chrome/Chromium ✅
- Firefox ✅
- Safari ✅
- Edge ✅

### Test Network Conditions

**Simulate Slow Network:**
1. DevTools → Network tab
2. Select "Slow 3G" from throttling
3. Try creating emergency
4. Watch progress and error handling

## 📊 Monitoring Backend Services

While testing, monitor the services:

```bash
# View logs in real-time
./scripts/docker-logs.sh

# Check service status
docker-compose ps

# View specific service logs
docker logs sos-api-gateway
docker logs sos-emergency-service
docker logs sos-auth-service
```

**Key things to monitor:**
- API Gateway receiving requests
- Emergency Service creating records
- Auth Service validating tokens
- Any errors or warnings

## 🐛 Troubleshooting

### "Cannot connect to server"
```bash
# Check services are running
docker-compose ps

# Start if not running
./scripts/docker-up.sh

# Check API Gateway is responsive
curl http://localhost:3000/health
```

### "Login fails"
```bash
# Check auth service logs
docker logs sos-auth-service

# Verify demo account exists - try registering new account
# Check database:
docker exec sos-postgres psql -U sos_user -d sos_db -c "SELECT * FROM users;"
```

### "Emergency not created"
```bash
# Check emergency service logs
docker logs sos-emergency-service

# Verify you held button for full 3 seconds
# Check browser console for errors (F12)
```

### "Location not captured"
```bash
# This is normal if:
# 1. You denied location permission
# 2. Browser doesn't support geolocation
# 3. You're using over HTTPS (some restrictions)

# To reset permissions in Chrome:
# Settings → Privacy → Site Settings → Location → Clear all
```

### "Slow responses"
```bash
# Check system resources
docker stats

# Restart services
./scripts/docker-down.sh
sleep 5
./scripts/docker-up.sh
```

## 🎯 Testing Checklist

Use this checklist to verify all functionality:

### Authentication
- [ ] Can register new account
- [ ] Can login with email/password
- [ ] Can logout
- [ ] Session persists on refresh
- [ ] Can view profile

### Emergencies
- [ ] Can trigger emergency (SOS button)
- [ ] Emergency appears in dashboard
- [ ] Can view emergency details
- [ ] Can cancel emergency
- [ ] Can resolve emergency
- [ ] Status updates in real-time
- [ ] Location captured (if enabled)
- [ ] Emergency appears in history

### Contacts
- [ ] Can add contact
- [ ] Can see contact in list
- [ ] Can delete contact
- [ ] All fields validate
- [ ] Priority levels work

### Dashboard
- [ ] Stats display correctly
- [ ] Auto-refresh works
- [ ] Multiple windows sync
- [ ] Responsive on mobile
- [ ] Navigation works

### Error Handling
- [ ] Clear error messages
- [ ] Graceful degradation
- [ ] Can retry operations
- [ ] API errors handled
- [ ] Timeouts handled

## 📞 Support

**Issues to Check:**

1. **Backend Services Not Running**
   ```bash
   ./scripts/docker-up.sh
   # Wait 30 seconds for services to start
   ```

2. **Port Conflicts**
   ```bash
   # Check what's using ports 3000, 3001-3010
   lsof -i :3000
   # Kill if needed
   kill -9 <PID>
   ```

3. **Browser Cache Issues**
   ```bash
   # Hard refresh
   Ctrl+Shift+R (or Cmd+Shift+R on Mac)
   # Or clear cache via DevTools
   ```

4. **CORS Errors**
   - Use local HTTP server instead of file:// protocol
   - Run: `python3 -m http.server 8000`

## 📖 Additional Resources

- Full documentation: `test-website/README.md`
- API client code: `test-website/api.js`
- App logic: `test-website/app.js`
- Backend API: http://localhost:3000 (when running)

## ✨ Tips for Best Experience

1. **Use Local Server**: Run on `localhost:8000` for full functionality
2. **Keep DevTools Open**: F12 to see console errors and network calls
3. **Test on Desktop First**: Then test mobile responsiveness
4. **Monitor Docker Logs**: Helps understand what's happening server-side
5. **Use Demo Account**: demo@sosapp.com has pre-configured data
6. **Allow Permissions**: Grant location access for complete testing
7. **Take Your Time**: Hold SOS button for full 3 seconds
8. **Check Status**: Always verify in multiple places (dashboard, history, etc.)

## 🎓 Learning Path

1. **Start Here**: Basic emergency alert (Scenario 1)
2. **Add Complexity**: Emergency contacts (Scenario 2)
3. **Advanced**: Location and real-time (Scenarios 3-4)
4. **Deep Dive**: Monitor backend logs while testing

---

**Happy Testing!** 🚀

For bugs or feedback about the testing website, check the GitHub issues or create a new one.
