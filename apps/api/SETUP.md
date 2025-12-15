# PayOS API Setup Guide

## Environment Variables Setup

The API server requires environment variables to connect to Supabase. Follow these steps:

### 1. Create .env file

Create a file named `.env` in the `apps/api` directory with the following content:

```bash
# PayOS API Environment Variables

# Supabase Configuration
SUPABASE_URL=https://lgsreshwntpdrthfgwos.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[REDACTED-SERVICE-ROLE-KEY]

# API Configuration
PORT=4000
NODE_ENV=development

# Dashboard URL (for invite emails, etc.)
DASHBOARD_URL=http://localhost:3001
```

### 2. Quick Setup Command

You can create the `.env` file with this single command:

```bash
cd /Users/haxaco/Dev/PayOS/apps/api

cat > .env << 'EOF'
SUPABASE_URL=https://lgsreshwntpdrthfgwos.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[REDACTED-SERVICE-ROLE-KEY]
PORT=4000
NODE_ENV=development
DASHBOARD_URL=http://localhost:3001
EOF
```

### 3. Verify Setup

After creating the `.env` file, verify it exists:

```bash
ls -la /Users/haxaco/Dev/PayOS/apps/api/.env
```

### 4. Start the API Server

```bash
cd /Users/haxaco/Dev/PayOS/apps/api
pnpm dev
```

You should see:
```
╔════════════════════════════════════════════╗
║           PayOS API Server                 ║
╠════════════════════════════════════════════╣
║  🚀 Starting on http://0.0.0.0:4000         ║
║  📚 Health: http://0.0.0.0:4000/health      ║
╚════════════════════════════════════════════╝
```

### 5. Test the API

```bash
# Health check
curl http://localhost:4000/health

# Test with API key
curl -H "Authorization: Bearer pk_test_GkRuyZ375fL5YLB6dtdztzQqpGPikXAadLaXGNp-5Kk" \
  http://localhost:4000/v1/accounts
```

## Troubleshooting

### Error: "Missing Supabase environment variables"
- Make sure the `.env` file exists in `apps/api/`
- Check that it contains both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Restart the API server after creating/updating `.env`

### Error: "EADDRINUSE: address already in use"
- Another process is using port 4000
- Find and kill it: `lsof -ti:4000 | xargs kill -9`
- Then restart the API server

### API returns empty data
- Make sure the database is seeded: `cd apps/api && pnpm seed:db`
- Check you're using the correct API key for the Acme Corporation tenant

## Security Note

⚠️ **IMPORTANT**: The `.env` file contains sensitive credentials and is gitignored. Never commit it to the repository!

