# Frontend Debug Steps

## Issue
Dashboard shows 0 accounts but database has 5 accounts.

## Debug Steps

### 1. Open Browser DevTools
Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows/Linux)

### 2. Check Console Tab
Look for these log messages:
```
[Dashboard] Accounts API response: {...}
[Dashboard] Accounts data: {...}
[Dashboard] Error fetching accounts: {...}
```

### 3. Check Network Tab
1. Filter by "accounts"
2. Look for request to `http://localhost:4000/v1/accounts?limit=1`
3. Check:
   - **Status Code:** Should be 200
   - **Request Headers:** Look for `Authorization: Bearer ...`
   - **Response:** Click on the request → Preview tab

### 4. Expected Response
```json
{
  "success": true,
  "data": [...],  // Array of accounts
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 1
  }
}
```

### 5. Possible Issues

**If you see 401 Unauthorized:**
- JWT token is invalid or expired
- Action: Log out and log back in

**If you see 403 Forbidden:**
- User doesn't have permissions
- Action: Check user_profiles table

**If you see 404 Not Found:**
- API endpoint not found
- Action: Check API server is running on port 4000

**If you see 500 Server Error:**
- API server error
- Action: Check terminal logs for API server

**If no request is made:**
- API client not initialized
- Auth token not available
- Action: Check console for initialization errors

### 6. Test API Directly

Open a new terminal and run:
```bash
# Get your JWT token from DevTools:
# 1. Go to Application tab
# 2. Storage → Local Storage → http://localhost:3000
# 3. Look for Supabase auth token

# Or from Console tab, run:
# localStorage.getItem('sb-lgsreshwntpdrthfgwos-auth-token')

# Then test API:
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:4000/v1/accounts?limit=1 | jq
```

### 7. Check API Server Logs

In the terminal running the API server, you should see:
```
DEBUG: Auth Success (JWT). Setting ctx: {
  tenantId: 'dad4308f-f9b6-4529-a406-7c2bdf3c6071',
  ...
}
--> GET /v1/accounts?limit=1 200 XXXms
```

### 8. Report Results

Please share:
1. Console log messages
2. Network tab status code
3. Response body from Network tab
4. Any error messages

This will help diagnose the exact issue!

