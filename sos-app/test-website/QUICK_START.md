# Quick Start Guide - SOS App Testing Dashboard

## 🚀 Start Testing in 3 Steps

### Step 1: Ensure Services are Running

```bash
cd /home/dinesh/sos-app-new/sos-app/sos-app
docker-compose -f docker-compose.dev.yml ps
```

**Expected output:** 8 containers running (postgres, redis, mongodb, auth-service, user-service, medical-service, communication-service, notification-service)

If services are not running:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### Step 2: Start the Test Website

**Option A: Using the start script (Recommended)**
```bash
cd /home/dinesh/sos-app-new/sos-app/sos-app/test-website
./start-server.sh
```

**Option B: Manual Python server**
```bash
cd /home/dinesh/sos-app-new/sos-app/sos-app/test-website
python3 -m http.server 8000
```

**Option C: Open directly in browser**
```bash
# Linux
xdg-open /home/dinesh/sos-app-new/sos-app/sos-app/test-website/index.html

# Mac
open /home/dinesh/sos-app-new/sos-app/sos-app/test-website/index.html

# Or manually navigate to the file in your browser
```

### Step 3: Open in Browser

Navigate to: **http://localhost:8000**

---

## ✅ Quick Test Scenario

Follow this sequence to test all services:

### 1. Authentication (30 seconds)
1. Click **"Auth Service"** tab
2. Click **"Register"** button (pre-filled form)
3. Click **"Login"** button
4. ✅ Check green "Authenticated" badge appears

### 2. User Profile (20 seconds)
1. Click **"User Service"** tab
2. Click **"Create Profile"** button
3. Click **"Get My Profile"** button
4. ✅ Verify profile data displays

### 3. Medical Records (30 seconds)
1. Click **"Medical Service"** tab
2. Select blood type, enter data
3. Click **"Create Medical Profile"**
4. Click **"Get My Medical Profile"**
5. ✅ Verify medical data displays

### 4. Real-time Communication (40 seconds)
1. Click **"Communication"** tab
2. Click **"Connect WebSocket"**
3. Wait for green "Connected" status
4. Enter message and click **"Send Message"**
5. ✅ Check message appears in real-time feed

### 5. Notifications (20 seconds)
1. Click **"Notifications"** tab
2. Fill in notification details
3. Click **"Send Notification"**
4. ✅ Verify success response

### 6. Health Check (10 seconds)
1. Click **"Health Checks"** tab
2. Click **"Check All Services"**
3. ✅ All services should show green "Online" status

**Total Test Time: ~2.5 minutes**

---

## 🎯 What You'll See

### Success Indicators
- ✅ Green badges for "Online" services
- ✅ Green "Authenticated" status
- ✅ "Connected" WebSocket status
- ✅ JSON responses with success messages
- ✅ Formatted data in result boxes

### If Something's Wrong
- ❌ Red "Offline" badges
- ❌ Error messages in result boxes
- ❌ "Connection Failed" WebSocket status
- ❌ Network errors in browser console

---

## 🔧 Troubleshooting

### Services Not Responding

```bash
# Check which containers are running
docker ps --filter "name=sos-"

# Restart all services
cd /home/dinesh/sos-app-new/sos-app/sos-app
docker-compose -f docker-compose.dev.yml restart

# Check specific service logs
docker logs sos-auth-service -f
```

### CORS Errors

If you see CORS errors in browser console:
1. ✅ Use the HTTP server (Option A or B above)
2. ❌ DON'T open index.html directly with `file://` protocol

### Port Already in Use

If port 8000 is busy:
```bash
# Use a different port
python3 -m http.server 9000
# Then open http://localhost:9000
```

### Browser Console Errors

1. Press **F12** to open DevTools
2. Click **Console** tab
3. Look for red error messages
4. Check **Network** tab for failed requests

---

## 📱 Browser Requirements

**Tested Browsers:**
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

**Required Features:**
- JavaScript enabled
- LocalStorage enabled
- WebSocket support
- Modern CSS support

---

## 🎨 Interface Overview

### Tabs
- **🔐 Auth Service** - Register, login, logout
- **👤 User Service** - Profile management
- **🏥 Medical Service** - Health records (HIPAA)
- **💬 Communication** - WebSocket messaging
- **🔔 Notifications** - Push, email, SMS alerts
- **❤️ Health Checks** - Service monitoring

### Status Indicators
- 🟢 Green badge = Service online / Authenticated
- 🔴 Red badge = Service offline / Not authenticated
- 🟡 Yellow text = Processing / Loading

### Test Data
All forms come pre-filled with sample data:
- Email: test@example.com
- Password: Test123!@#
- Names: John Doe, Test User
- Phone: +1234567890
- Medical: Sample allergies, conditions, medications

---

## 📊 Service Endpoints Tested

| Service | Port | Endpoints Tested |
|---------|------|------------------|
| Auth | 3001 | /register, /login, /logout, /me |
| User | 3002 | /profiles, /profiles/me |
| Medical | 3003 | /medical-profiles, /conditions |
| Communication | 3004 | WebSocket connection, /messages |
| Notification | 3005 | /notifications/send, /emergency |

---

## 💾 Data Storage

**Where is test data stored?**
- Authentication: PostgreSQL (sos_auth database)
- User profiles: PostgreSQL (sos_user database)
- Medical records: PostgreSQL (sos_medical database)
- Messages: MongoDB (sos_communication database)
- Notifications: MongoDB (sos_notifications database)

**View database data:**
```bash
# PostgreSQL
docker exec sos-postgres psql -U postgres -d sos_auth -c "SELECT * FROM users;"

# MongoDB
docker exec sos-mongodb mongosh -u mongo -p mongo --eval "use sos_communication; db.messages.find()"
```

---

## 🔐 Security Notes

⚠️ **This is a TESTING interface - NOT for production use**

**Current Security (Development):**
- HTTP (not HTTPS)
- Tokens in localStorage
- CORS wide open
- No rate limiting
- Test credentials

**For Production You Need:**
- HTTPS everywhere
- Secure token storage
- Strict CORS policy
- Rate limiting
- Strong passwords
- API gateway
- Authentication middleware

---

## 📞 Getting Help

**Check Logs:**
```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Specific service
docker logs sos-auth-service -f
```

**Restart Everything:**
```bash
docker-compose -f docker-compose.dev.yml restart
```

**Clean Restart:**
```bash
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d
```

**View Documentation:**
- [Full README](README.md) - Comprehensive guide
- [Deployment Docs](../DEPLOYMENT_UPDATE_2025-11-06.md) - Service setup

---

## ✨ Tips & Tricks

1. **Auto-fill forms** - All forms have sample data, just click submit
2. **Copy responses** - Click JSON response to select and copy
3. **Multiple tabs** - Open multiple browser tabs to test concurrent users
4. **Browser DevTools** - Use Network tab to see all API calls
5. **Health auto-refresh** - Health checks update every 30 seconds
6. **Token persistence** - Login token survives page refresh
7. **WebSocket reconnect** - Auto-reconnects if connection drops

---

**Happy Testing! 🎉**

For detailed information, see [README.md](README.md)
