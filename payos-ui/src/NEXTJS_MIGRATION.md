# Next.js App Router Migration Guide

## Migration Status: ✅ COMPLETE

PayOS has been successfully migrated from custom state-based routing to **Next.js App Router** with route groups.

## What Changed

### Architecture
- **Old**: Custom state-based routing in `/App.tsx` using `useState` and conditional rendering
- **New**: Next.js App Router with file-based routing in `/app` directory

### URL Structure
All routes now have proper URLs:
- `/` - Home page
- `/accounts` - Accounts list
- `/accounts/[id]` - Account detail
- `/transactions` - Transactions list
- `/transactions/[id]` - Transaction detail
- `/cards` - Cards list
- `/cards/[id]` - Card detail
- `/compliance` - Compliance flags list
- `/compliance/[id]` - Compliance flag detail
- `/treasury` - Treasury page
- `/agents` - Agents list
- `/agents/[id]` - Agent detail
- `/api-keys` - API Keys management
- `/webhooks` - Webhooks management
- `/request-logs` - Request logs
- `/templates` - Templates configuration
- `/verification-tiers` - Verification tiers
- `/agent-verification-tiers` - Agent verification tiers (KYA)
- `/reports` - Reports & exports
- `/settings` - Settings

### Navigation
- **Old**: `onNavigate('page-name', id)` callback props
- **New**: 
  - `router.push('/path')` for programmatic navigation
  - `<Link href="/path">` for declarative navigation
  - `usePathname()` for getting current route

### Benefits
✅ **SEO**: Proper URLs for all pages  
✅ **Back/Forward**: Browser navigation works  
✅ **Deep Linking**: Direct links to any page  
✅ **Performance**: Code splitting per route  
✅ **TypeScript**: Better type safety with route params  

## File Structure

```
/app
  /layout.tsx                          # Root layout
  /(dashboard)
    /layout.tsx                        # Dashboard layout with Sidebar, TopBar, AI Assistant
    /page.tsx                          # Home page (/)
    /loading.tsx                       # Loading state
    /error.tsx                         # Error boundary
    /not-found.tsx                     # 404 page
    /accounts
      /page.tsx                        # /accounts
      /[id]
        /page.tsx                      # /accounts/[id]
    /transactions
      /page.tsx                        # /transactions
      /[id]/page.tsx                   # /transactions/[id]
    /cards
      /page.tsx                        # /cards
      /[id]/page.tsx                   # /cards/[id]
    /compliance
      /page.tsx                        # /compliance
      /[id]/page.tsx                   # /compliance/[id]
    /agents
      /page.tsx                        # /agents
      /[id]/page.tsx                   # /agents/[id]
    ... (other routes)
```

## Migration Utilities

### `useLegacyNavigation` Hook
For pages that haven't been fully converted yet, use this hook to maintain compatibility:

```tsx
'use client';

import { useLegacyNavigation } from '../lib/useLegacyNavigation';

export default function MyPage() {
  const { onNavigate } = useLegacyNavigation();
  return <MyPageComponent onNavigate={onNavigate} />;
}
```

### `legacyPageToRoute` Function
Maps old page names to new routes:

```tsx
import { legacyPageToRoute } from '../lib/navigation';

const route = legacyPageToRoute('account-detail', 'acc_123');
// Returns: '/accounts/acc_123'
```

## Fully Migrated Pages
These pages have been updated to use Next.js router directly:
- ✅ HomePage
- ✅ AccountsPage

## Pages Using Legacy Bridge
These pages use `useLegacyNavigation` hook until full migration:
- AccountDetailPage
- TransactionsPage
- TransactionDetailPage
- CardsPage
- CardDetailPage
- CompliancePage
- ComplianceFlagDetailPage
- TreasuryPage
- AgentsPage
- AgentDetailPage
- TemplatesPage
- VerificationTiersPage
- AgentVerificationTiersPage
- SettingsPage

## Pages Without Navigation
These pages don't require navigation updates:
- ReportsPage
- APIKeysPage
- WebhooksPage
- RequestLogsPage

## Next Steps (Optional Future Improvements)

1. **Convert all pages to use `useRouter` directly** instead of the legacy bridge
2. **Add route transitions** using Next.js transitions API
3. **Implement route prefetching** for instant navigation
4. **Add metadata** to each page for better SEO
5. **Consider Server Components** where appropriate (currently all client components)

## Breaking Changes

None! The migration maintains backward compatibility using the legacy bridge utilities.
