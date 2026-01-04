# ⚠️ DEPRECATED: @payos/x402-provider-sdk

**This package is deprecated and will no longer receive updates.**

## 🚨 Action Required

**Please migrate to `@payos/sdk` before April 1, 2026.**

---

## Migration

### Before (Old)
```typescript
import { X402Provider } from '@payos/x402-provider-sdk';
import express from 'express';

const app = express();
const provider = new X402Provider({
  routes: {
    '/api/protected': { price: '0.01' },
  },
});

app.use('/api', provider.middleware());
```

### After (New)
```typescript
import { PayOS } from '@payos/sdk';
import express from 'express';

const app = express();
const payos = new PayOS({
  apiKey: process.env.PAYOS_API_KEY!,
  environment: 'production', // or 'sandbox' for testing
});

const provider = payos.x402.createProvider({
  'GET /api/protected': { 
    price: '0.01',
    description: 'Access protected resource',
  },
});

app.use('/api', provider.middleware());
```

---

## Why Migrate?

The new `@payos/sdk` provides:

✅ **Unified API** - One SDK for x402, AP2, and ACP protocols  
✅ **Better TypeScript** - Improved type safety and IntelliSense  
✅ **Sandbox Mode** - Test without real payments  
✅ **Better 402 Responses** - Improved client experience  
✅ **Wildcard Routes** - Match routes with patterns  
✅ **Custom Tokens** - Per-route token support  
✅ **Debug Mode** - Better debugging tools  

---

## Full Migration Guide

**See the complete migration guide:**  
📖 https://docs.payos.ai/migration

Or in the repo:  
📖 `/docs/MIGRATION_GUIDE.md`

---

## Timeline

| Date | Status |
|------|--------|
| **Jan 3, 2026** | ⚠️ Deprecated (current) |
| **Feb 1, 2026** | Security updates only |
| **Apr 1, 2026** | Unmaintained |
| **Jul 1, 2026** | Removed from npm |

---

## Need Help?

- 📖 [Migration Guide](https://docs.payos.ai/migration)
- 💬 [Discord Support](https://discord.gg/payos)
- 📧 [Email: support@payos.ai](mailto:support@payos.ai)
- 🎫 [Open Support Ticket](https://payos.ai/support)

---

**Don't delay - migrate today!** 🚀

