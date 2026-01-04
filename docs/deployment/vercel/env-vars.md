# Vercel Environment Variables for PayOS Dashboard

## 📝 **Required Variables for `apps/web`**

Add these environment variables in **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**:

### 1. API Connection
```bash
NEXT_PUBLIC_API_URL=https://payos-production.up.railway.app
```
**Description:** URL of your PayOS API deployed on Railway

---

### 2. Supabase Configuration
```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_YOUR_ANON_KEY
```

**Description:**  
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase publishable key (safe for client-side use)

---

## 🎯 **How to Add Environment Variables in Vercel**

### Option 1: Via Vercel Dashboard (Recommended)

1. Go to: https://vercel.com/dashboard
2. Select your project: `payos-web`
3. Click **Settings** tab
4. Click **Environment Variables** in the left sidebar
5. For each variable:
   - **Key:** Enter the variable name (e.g., `NEXT_PUBLIC_API_URL`)
   - **Value:** Enter the value
   - **Environments:** Select **Production**, **Preview**, and **Development**
   - Click **Save**
6. After adding all variables, **redeploy** your app

### Option 2: Via Vercel CLI

```bash
cd apps/web

# Add each variable
vercel env add NEXT_PUBLIC_API_URL
# When prompted, paste: https://payos-production.up.railway.app
# Select: Production, Preview, Development

vercel env add NEXT_PUBLIC_SUPABASE_URL
# When prompted, paste: https://YOUR_PROJECT.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# When prompted, paste: sb_publishable_YOUR_ANON_KEY

# Redeploy to apply changes
vercel --prod
```

---

## ✅ **Verification**

After adding environment variables and redeploying:

1. **Check Build Logs:**
   - Go to Vercel Dashboard → Deployments → Latest deployment
   - Verify no errors about missing environment variables

2. **Test the Dashboard:**
   - Visit: https://payos-web.vercel.app
   - Login with your Supabase credentials
   - Go to **Settings** or **API Keys** page
   - Check browser console (F12) for the API URL:
     ```javascript
     console.log(process.env.NEXT_PUBLIC_API_URL)
     // Should print: https://payos-production.up.railway.app
     ```

3. **Test API Connection:**
   - Go to: https://payos-web.vercel.app/dashboard/api-keys
   - Enter your test API key: `pk_test_YOUR_API_KEY_HERE`
   - Click **Save**
   - If successful, you should see a success message ✅

---

## 🚨 **Important Notes**

### Why `NEXT_PUBLIC_` Prefix?
- Next.js only exposes environment variables with the `NEXT_PUBLIC_` prefix to the browser
- Without this prefix, the variables will be `undefined` in client-side code
- The API key is stored separately in localStorage (not in env vars)

### Security
- ✅ **SAFE:** `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable, designed for client-side)
- ✅ **SAFE:** `NEXT_PUBLIC_API_URL` (just a URL)
- ❌ **NEVER EXPOSE:** Service role keys, secret keys, or API keys in `NEXT_PUBLIC_*` variables

### After Changing Environment Variables
- Always **redeploy** the app for changes to take effect
- Vercel caches environment variables at build time
- You can trigger a redeploy from: Dashboard → Deployments → ⋮ → Redeploy

---

## 🔗 **Quick Links**

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Your Dashboard:** https://payos-web.vercel.app
- **Your API:** https://payos-production.up.railway.app

---

## 📚 **What Each Variable Does**

| Variable | Used By | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | Dashboard API client | Makes requests to PayOS API (accounts, transfers, etc.) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase auth client | Connects to Supabase for user authentication |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase auth client | Authenticates with Supabase (JWT validation) |

---

## 🐛 **Troubleshooting**

### "API key validation failed"
- ✅ Check that `NEXT_PUBLIC_API_URL` is set correctly
- ✅ Verify Railway API is running (check health endpoint)
- ✅ Make sure API URL doesn't have a trailing slash

### "Supabase error: Invalid API key"
- ✅ Check that `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
- ✅ Use the **publishable** key (starts with `sb_publishable_`), not the secret key

### "Environment variables not working"
- ✅ Make sure variables start with `NEXT_PUBLIC_`
- ✅ Redeploy after adding/changing variables
- ✅ Clear browser cache and hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

---

**Need help?** Check deployment logs in Vercel Dashboard or Railway logs for detailed errors.

