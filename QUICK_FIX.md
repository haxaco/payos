# 🚨 QUICK FIX - 3 Steps to Resolve Leaked Key

**Total Time: ~15 minutes**

---

## 🔴 STEP 1: Create NEW Secret Key (Better System!) (2 min)

**IMPORTANT:** Use the NEW key system, not legacy!

```
1. Open: https://app.supabase.com/project/lgsreshwntpdrthfgwos/settings/api
2. Click "API Keys" tab (NOT "Legacy API Keys")
3. Click "Create new API Key"
4. Select "Secret key" type
5. COPY THE NEW KEY (format: sb_secret_xxx)
6. Also copy the "Publishable key" (format: sb_publishable_xxx)
7. Done! Old leaked key is invalid, and you're on better system ✅
```

**Why?** New keys are safer, easier to rotate, and mobile-friendly!
[Learn more](https://supabase.com/docs/guides/api/api-keys)

---

## 🟡 STEP 2: Update Local Environment (1 min)

```bash
nano /Users/haxaco/Dev/PayOS/apps/api/.env
```

Update these lines with NEW keys from Step 1:
```bash
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx      # New secret key
SUPABASE_ANON_KEY=sb_publishable_xxx         # New publishable key
```

Also update frontend:
```bash
nano /Users/haxaco/Dev/PayOS/payos-ui/.env
```

Update:
```bash
VITE_SUPABASE_ANON_KEY=sb_publishable_xxx    # Same publishable key
```

Save and exit (`Ctrl+X`, then `Y`, then `Enter`)

---

## 🟢 STEP 3: Clean Git & Push (10 min)

```bash
cd /Users/haxaco/Dev/PayOS

# Run the cleanup script
./clean-git-history.sh

# When it finishes, force push
git push origin main --force
```

---

## ✅ Done!

Wait 5-10 minutes, then check:
https://github.com/haxaco/payos/security

The alert should clear automatically. If not, click "Dismiss" and select "Revoked".

---

## 📚 Need More Details?

- **Complete checklist:** See `SECURITY_FIX_CHECKLIST.md`
- **Full incident guide:** See `SECURITY_INCIDENT_RESPONSE.md`

---

**Questions? Run into issues?**

Common issues:

1. **Script fails:** See manual method in `SECURITY_FIX_CHECKLIST.md`
2. **Force push rejected:** Make sure you have permission, try adding `--no-verify`
3. **API won't start:** Double-check the new key format (`sb_secret_xxx`)
4. **Frontend errors:** Make sure you used publishable key (`sb_publishable_xxx`)

---

## 🎉 Bonus: You're Now on the Better Key System!

By using the new **secret** and **publishable** keys, you get:

✅ **Independent rotation** - Change any key without downtime  
✅ **Better security** - Secret keys blocked in browsers automatically  
✅ **Mobile-friendly** - No forced app updates when rotating  
✅ **Easy rollback** - Can undo if something goes wrong  

**Full migration guide:** See `MIGRATION_TO_NEW_KEYS.md`

