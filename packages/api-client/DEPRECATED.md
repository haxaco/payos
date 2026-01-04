# ⚠️ DEPRECATED: @payos/api-client

**This package is deprecated and will no longer receive updates.**

## 🚨 Action Required

**Please migrate to `@payos/sdk` before April 1, 2026.**

---

## Migration

### Before (Old)
```typescript
import { PayOSApiClient } from '@payos/api-client';

const client = new PayOSApiClient({
  apiKey: process.env.PAYOS_API_KEY,
  baseUrl: 'https://api.payos.ai',
});

const quote = await client.post('/settlements/quote', {
  amount: 100,
  fromCurrency: 'USD',
  toCurrency: 'BRL',
});

const settlement = await client.post('/settlements', {
  quoteId: quote.id,
  recipientId: 'acc_123',
});
```

### After (New)
```typescript
import { PayOS } from '@payos/sdk';

const payos = new PayOS({
  apiKey: process.env.PAYOS_API_KEY!,
  environment: 'production', // or 'sandbox' for testing
});

const quote = await payos.getSettlementQuote({
  amount: '100',
  fromCurrency: 'USD',
  toCurrency: 'BRL',
});

const settlement = await payos.createSettlement({
  quoteId: quote.id,
  destinationAccountId: 'acc_123',
});
```

---

## Why Migrate?

The new `@payos/sdk` provides:

✅ **Type-Safe Methods** - No more raw path strings  
✅ **IntelliSense** - Full autocomplete support  
✅ **Better Errors** - Structured error codes and messages  
✅ **Multi-Protocol** - x402, AP2, ACP in one SDK  
✅ **AI Integrations** - OpenAI, Claude, LangChain, Vercel  
✅ **Sandbox Mode** - Test without real API calls  

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

