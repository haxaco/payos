# Security Checklist: CVE-2025-55184 & CVE-2025-55183

## Immediate Actions ⚡

- [ ] **Check Next.js version**: Currently on `16.1.1` - Check for security updates
- [ ] **Monitor Vercel Dashboard**: Watch for unusual CPU/memory spikes
- [ ] **Enable Vercel Web Analytics**: Already installed, verify it's active
- [ ] **Review Server Logs**: Check for suspicious `text/x-component` requests

```bash
# Check current Next.js version
cd apps/web && npm list next

# Check for updates
npm info next versions | tail -10

# Update when patch available
pnpm update next@latest
```

## Quick Wins (Today) ✅

- [ ] **Add Rate Limiting Middleware** (see below)
- [ ] **Enable Request Logging** for suspicious patterns
- [ ] **Set up CPU Usage Alerts** in Vercel
- [ ] **Verify No Hardcoded Secrets** in components

## This Week 📅

- [ ] **Deploy Next.js Patch** (when available)
- [ ] **Test in Staging First**
- [ ] **Implement WAF Rules** (Vercel Pro feature)
- [ ] **Audit All Server Components**
- [ ] **Update Incident Response Plan**

---

## Quick Middleware Fix

Create `apps/web/middleware.ts` (if it doesn't exist):

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple rate limiting (in-memory, resets on deploy)
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function middleware(request: NextRequest) {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  
  // Rate limiting
  const userLimit = requestCounts.get(ip);
  if (userLimit) {
    if (now < userLimit.resetAt) {
      if (userLimit.count > 100) {
        return new NextResponse('Too Many Requests', { status: 429 });
      }
      userLimit.count++;
    } else {
      requestCounts.set(ip, { count: 1, resetAt: now + 60000 });
    }
  } else {
    requestCounts.set(ip, { count: 1, resetAt: now + 60000 });
  }
  
  // Block suspicious RSC payloads
  const contentType = request.headers.get('content-type');
  const rscAction = request.headers.get('x-rsc-action');
  
  if (contentType?.includes('text/x-component')) {
    // Log suspicious request
    console.warn('[Security] Suspicious RSC request detected:', {
      ip,
      path: request.nextUrl.pathname,
      contentType,
      rscAction,
    });
    
    // For now, allow but monitor
    // TODO: Block when confident in detection
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

---

## Monitoring Queries

### Vercel Logs (via CLI)

```bash
# Install Vercel CLI
npm i -g vercel

# Check recent logs
vercel logs [your-project-name] --since 1h

# Monitor for suspicious patterns
vercel logs [your-project-name] --follow | grep -i "text/x-component\|x-rsc-action"
```

### Check for Updates Script

Create `apps/web/scripts/check-security-updates.sh`:

```bash
#!/bin/bash

echo "🔍 Checking for Next.js security updates..."
echo ""

# Current version
CURRENT=$(npm list next --depth=0 | grep next@ | sed 's/.*next@//' | sed 's/ .*//')
echo "Current Next.js version: $CURRENT"

# Latest version
LATEST=$(npm info next version)
echo "Latest Next.js version:  $LATEST"

echo ""

if [ "$CURRENT" != "$LATEST" ]; then
  echo "⚠️  UPDATE AVAILABLE!"
  echo ""
  echo "Release notes:"
  npm info next@$LATEST | grep -A 20 "## v$LATEST"
  echo ""
  echo "To update:"
  echo "  cd apps/web"
  echo "  pnpm update next@$LATEST"
  echo "  pnpm install"
  echo "  npm run build"
else
  echo "✅ You are on the latest version"
fi
```

Make it executable:
```bash
chmod +x apps/web/scripts/check-security-updates.sh
```

---

## Verification Commands

```bash
# 1. Check Next.js version
cd apps/web && npm list next

# 2. Check for Server Actions usage
grep -r "use server" src/

# 3. Check for hardcoded secrets
grep -rn "sk_\|api_key\|secret" src/ --exclude-dir=node_modules

# 4. List all route handlers
find src/app -name "route.ts" -o -name "route.js"

# 5. Check middleware exists
cat middleware.ts 2>/dev/null || echo "⚠️  No middleware.ts found"
```

---

## When Patch is Released

1. **Read Release Notes** carefully
2. **Update local environment** first:
   ```bash
   cd apps/web
   pnpm update next@latest
   pnpm install
   ```

3. **Test locally**:
   ```bash
   npm run build
   npm run start
   # Test all critical flows
   ```

4. **Deploy to staging** (if you have one):
   ```bash
   vercel --prod=false
   ```

5. **Verify staging** works correctly

6. **Deploy to production**:
   ```bash
   vercel --prod
   # Or via GitHub push if using auto-deploy
   ```

7. **Monitor for 24 hours** after deployment

---

## Emergency Contact

If you detect active exploitation:

1. **Disable deployment** in Vercel dashboard
2. **Contact Vercel Support**: https://vercel.com/support
3. **Review logs** for attack patterns
4. **Rotate sensitive keys** if code exposure suspected

---

## Current Status

**Date**: January 1, 2026  
**Next.js**: 16.1.1  
**Status**: ⚠️ Awaiting security patch  
**Risk**: 🔴 HIGH

**Next Action**: Check for updates daily until patched

