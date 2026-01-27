# ⚠️ DEPRECATED: @sly/x402-client-sdk

**This package is deprecated and will no longer receive updates.**

## 🚨 Action Required

**Please migrate to `@sly/sdk` before April 1, 2026.**

---

## Migration

### Before (Old)
```typescript
import { X402Client } from '@sly/x402-client-sdk';

const client = new X402Client({
  apiKey: process.env.PAYOS_API_KEY,
  evmPrivateKey: process.env.EVM_PRIVATE_KEY,
});

const response = await client.fetch('https://api.example.com/protected');
```

### After (New)
```typescript
import { PayOS } from '@sly/sdk';

const payos = new PayOS({
  apiKey: process.env.PAYOS_API_KEY!,
  environment: 'production', // or 'sandbox' for testing
  evmPrivateKey: process.env.EVM_PRIVATE_KEY,
});

const x402Client = payos.x402.createClient();
const response = await x402Client.fetch('https://api.example.com/protected');
```

---

## Why Migrate?

The new `@sly/sdk` provides:

✅ **Unified API** - One SDK for x402, AP2, and ACP protocols  
✅ **Better TypeScript** - Improved type safety and IntelliSense  
✅ **Sandbox Mode** - Test without EVM keys or real transactions  
✅ **AI Integrations** - OpenAI, Claude, LangChain, Vercel AI SDK  
✅ **Active Development** - Regular updates and new features  
✅ **Better Documentation** - Comprehensive guides and examples  

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

