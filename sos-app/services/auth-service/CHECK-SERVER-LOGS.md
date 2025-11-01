# Check Server Logs for Error Details

The registration test is failing with a 500 error. To diagnose this, I need to see the **detailed error from the server logs**.

## 📋 What to Do

### Step 1: Look at Terminal 1 (where `npm run dev` is running)

When you run `node test-features.js`, the server logs will show the **actual error** that's causing the registration to fail.

### Step 2: Share the Error Lines

Look for log entries that appear **right when you run the test**. They will look something like:

```
2025-11-01 08:56:18 [error]: Error message here
2025-11-01 08:56:18 [error]: SequelizeConnectionError: ...
OR
2025-11-01 08:56:18 [error]: Error: ...
    at AuthService.register (...)
    at ...
```

### Step 3: Share the Complete Error

Please copy and paste:
1. **All error lines** from when you run the test
2. Any lines that say `[error]` or show stack traces
3. Lines around the timestamp when the test ran

---

## 🔍 Common Issues and What to Look For

### Issue 1: Database Connection Error
**Log will show:**
```
[error]: SequelizeConnectionError: relation "users" does not exist
```
**OR**
```
[error]: SequelizeConnectionError: database "sos_app_auth" does not exist
```

**Fix:** Tables need to be created
```bash
# Stop server (Ctrl+C)
# Restart to auto-create tables
npm run dev
```

---

### Issue 2: Redis Connection Error
**Log will show:**
```
[error]: Redis connection failed
[error]: connect ECONNREFUSED 127.0.0.1:6379
```

**Fix:** Restart Redis
```bash
docker start redis-sos
```

---

### Issue 3: Missing Environment Variable
**Log will show:**
```
[error]: Missing required configuration: jwt.secret
```

**Fix:** Check `.env` file exists and has all required values

---

### Issue 4: Unique Constraint Violation
**Log will show:**
```
[error]: SequelizeUniqueConstraintError: Validation error
```

**Fix:** User might already exist - the test creates unique emails each time, so this is unlikely

---

## 🛠️ Quick Diagnostic Commands

Run these to check system status:

```bash
# Check if database is accessible
docker exec postgres-sos psql -U postgres -d sos_app_auth -c "SELECT 1"

# Check if tables exist
docker exec postgres-sos psql -U postgres -d sos_app_auth -c "\dt"

# Check Redis connection
docker exec redis-sos redis-cli ping
```

---

## 📤 What to Share

Please share:

1. **Server logs from Terminal 1** (the lines with [error])
2. Output from running:
   ```bash
   docker exec postgres-sos psql -U postgres -d sos_app_auth -c "\dt"
   ```

This will help me identify the exact issue and provide a fix!

---

## 🔄 Temporary Workaround

While we diagnose, you can try this:

```bash
# Terminal 1: Stop the server (Ctrl+C)

# Delete and recreate the database
docker exec postgres-sos psql -U postgres -c "DROP DATABASE IF EXISTS sos_app_auth"
docker exec postgres-sos psql -U postgres -c "CREATE DATABASE sos_app_auth"

# Restart the server (this will auto-create tables)
npm run dev

# Wait for: "Database synced successfully"

# Then run tests again
node test-features.js
```
