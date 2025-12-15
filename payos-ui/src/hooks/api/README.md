# API Hooks

Reusable React hooks for fetching data from the PayOS API with built-in loading states, error handling, authentication, and retry logic.

## Features

✅ **Automatic Authentication** - Uses access token from `useAuth` automatically  
✅ **Loading States** - Built-in loading indicators  
✅ **Error Handling** - Comprehensive error handling with custom callbacks  
✅ **Auto Retry** - Automatic retry on network failures (configurable)  
✅ **Session Management** - Auto-logout on 401 errors  
✅ **TypeScript** - Fully typed with TypeScript  
✅ **Refetch** - Manual refetch capability  
✅ **Filters & Pagination** - Easy query parameter handling  

---

## Quick Start

### Basic Usage

```typescript
import { useAccounts } from '@/hooks/api';

function AccountsPage() {
  const { data, loading, error, refetch } = useAccounts();
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!data?.accounts.length) return <EmptyState />;
  
  return (
    <div>
      <AccountsList accounts={data.accounts} />
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

### With Filters

```typescript
import { useAccounts } from '@/hooks/api';

function PersonAccountsPage() {
  const filters = {
    type: 'person' as const,
    verification_status: 'verified' as const,
    limit: 50,
  };
  
  const { data, loading, error } = useAccounts(filters);
  
  // ... render logic
}
```

### Single Resource

```typescript
import { useAccount } from '@/hooks/api';
import { useParams } from 'react-router-dom';

function AccountDetailPage() {
  const { accountId } = useParams();
  const { data: account, loading, error } = useAccount(accountId);
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!account) return <NotFound />;
  
  return <AccountDetail account={account} />;
}
```

---

## Available Hooks

### Accounts

#### `useAccounts(filters?: AccountFilters)`
Fetch list of accounts with optional filters.

**Filters:**
- `type`: `'person' | 'business'`
- `status`: `'active' | 'suspended' | 'closed'`
- `verification_status`: `'unverified' | 'pending' | 'verified' | 'suspended'`
- `search`: Search query
- `limit`: Number of results
- `offset`: Pagination offset

**Returns:** `{ data: AccountsResponse, loading, error, refetch }`

#### `useAccount(accountId: string)`
Fetch a single account by ID.

**Returns:** `{ data: Account, loading, error, refetch }`

**Example:**
```typescript
const { data: accounts } = useAccounts({ 
  type: 'person',
  limit: 20 
});

const { data: account } = useAccount('account-id-here');
```

---

### Transfers

#### `useTransfers(filters?: TransferFilters)`
Fetch list of transfers with optional filters.

**Filters:**
- `type`: `'cross_border' | 'internal' | 'stream_start' | ...`
- `status`: `'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'`
- `from_account_id`: Filter by sender
- `to_account_id`: Filter by recipient
- `from_date`: Start date (ISO string)
- `to_date`: End date (ISO string)
- `min_amount`: Minimum amount
- `max_amount`: Maximum amount
- `search`: Search query
- `limit`: Number of results
- `offset`: Pagination offset

**Returns:** `{ data: TransfersResponse, loading, error, refetch }`

#### `useTransfer(transferId: string)`
Fetch a single transfer by ID.

**Returns:** `{ data: Transfer, loading, error, refetch }`

**Example:**
```typescript
const { data: transfers } = useTransfers({ 
  status: 'completed',
  from_date: '2025-01-01',
  limit: 50
});

const { data: transfer } = useTransfer('transfer-id-here');
```

---

### Payment Methods

#### `usePaymentMethods(filters?: PaymentMethodFilters)`
Fetch list of payment methods with optional filters.

**Filters:**
- `type`: `'bank_account' | 'wallet' | 'card'`
- `account_id`: Filter by account
- `is_default`: Filter default payment methods
- `is_verified`: Filter verified payment methods
- `limit`: Number of results
- `offset`: Pagination offset

**Returns:** `{ data: PaymentMethodsResponse, loading, error, refetch }`

#### `usePaymentMethod(paymentMethodId: string)`
Fetch a single payment method by ID.

**Returns:** `{ data: PaymentMethod, loading, error, refetch }`

#### `useAccountPaymentMethods(accountId: string)`
Fetch payment methods for a specific account.

**Returns:** `{ data: PaymentMethodsResponse, loading, error, refetch }`

**Example:**
```typescript
const { data: cards } = usePaymentMethods({ 
  type: 'card',
  is_verified: true 
});

const { data: accountPMs } = useAccountPaymentMethods('account-id');
```

---

### Agents

#### `useAgents(filters?: AgentFilters)`
Fetch list of agents with optional filters.

**Filters:**
- `parent_account_id`: Filter by parent account
- `status`: `'active' | 'paused' | 'suspended'`
- `kya_status`: `'unverified' | 'pending' | 'verified' | 'suspended'`
- `min_kya_tier`: Minimum KYA tier
- `search`: Search query
- `limit`: Number of results
- `offset`: Pagination offset

**Returns:** `{ data: AgentsResponse, loading, error, refetch }`

#### `useAgent(agentId: string)`
Fetch a single agent by ID.

**Returns:** `{ data: Agent, loading, error, refetch }`

**Example:**
```typescript
const { data: agents } = useAgents({ 
  status: 'active',
  min_kya_tier: 2 
});

const { data: agent } = useAgent('agent-id-here');
```

---

### Streams

#### `useStreams(filters?: StreamFilters)`
Fetch list of streams with optional filters.

**Filters:**
- `status`: `'active' | 'paused' | 'cancelled'`
- `sender_account_id`: Filter by sender
- `receiver_account_id`: Filter by receiver
- `search`: Search query
- `limit`: Number of results
- `offset`: Pagination offset

**Returns:** `{ data: StreamsResponse, loading, error, refetch }`

#### `useStream(streamId: string)`
Fetch a single stream by ID.

**Returns:** `{ data: Stream, loading, error, refetch }`

#### `useAccountStreams(accountId: string)`
Fetch streams for a specific account (as sender).

**Returns:** `{ data: StreamsResponse, loading, error, refetch }`

**Example:**
```typescript
const { data: streams } = useStreams({ status: 'active' });

const { data: accountStreams } = useAccountStreams('account-id');
```

---

## Advanced Usage

### Custom Error Handling

```typescript
const { data, error } = useAccounts({}, {
  onError: (error) => {
    console.error('Failed to fetch accounts:', error);
    // Custom error handling (e.g., toast notification)
  }
});
```

### Skip Automatic Fetching

```typescript
const { data, loading, refetch } = useAccounts({}, { skip: true });

// Later, manually trigger fetch:
<button onClick={refetch}>Load Accounts</button>
```

### Mutations (POST/PUT/DELETE)

```typescript
import { useApiMutation } from '@/hooks/api';

function CreateAccountButton() {
  const { mutate, loading, error } = useApiMutation();
  
  const handleCreate = async () => {
    try {
      const newAccount = await mutate('/v1/accounts', 'POST', {
        type: 'person',
        name: 'John Doe',
        email: 'john@example.com'
      });
      console.log('Created:', newAccount);
    } catch (err) {
      console.error('Failed:', err);
    }
  };
  
  return (
    <button onClick={handleCreate} disabled={loading}>
      {loading ? 'Creating...' : 'Create Account'}
    </button>
  );
}
```

### Conditional Fetching

```typescript
function AccountDetail({ accountId }: { accountId?: string }) {
  // Only fetch if accountId is provided
  const { data, loading } = useAccount(accountId, { skip: !accountId });
  
  if (!accountId) return <SelectAccount />;
  if (loading) return <LoadingSpinner />;
  
  return <div>{data?.name}</div>;
}
```

---

## Response Structure

All hooks return an object with:

```typescript
{
  data: T | null,           // API response data (null while loading or on error)
  loading: boolean,         // True while fetching
  error: Error | null,      // Error object if request failed
  refetch: () => Promise<void>  // Function to manually refetch data
}
```

---

## Configuration

### API Base URL

Set via environment variable:

```bash
# .env
VITE_API_URL=http://localhost:4000
```

### Retry Configuration

Default: 2 retry attempts with 1000ms delay between retries.

To customize, modify `useApi.ts`:

```typescript
const { data } = useAccounts({}, {
  retryAttempts: 3,
  retryDelay: 2000, // 2 seconds
});
```

---

## TypeScript Types

All types are exported from `@/types/api`:

```typescript
import type { 
  Account, 
  Transfer, 
  PaymentMethod,
  Agent,
  Stream,
  AccountFilters,
  TransferFilters
} from '@/types/api';
```

---

## Error Handling

### Automatic Behaviors:

1. **401 Unauthorized**: Automatically logs user out and redirects to login
2. **Network Errors**: Retries 2 times with 1 second delay
3. **Other Errors**: Sets `error` in hook return value

### Custom Error Handling:

```typescript
const { error } = useAccounts();

if (error) {
  if (error.message.includes('Session expired')) {
    // User was logged out
  } else if (error.message.includes('Network')) {
    // Network issue
  } else {
    // Other error
  }
}
```

---

## Best Practices

1. **Use filters for large lists**: Always use `limit` and pagination for lists
2. **Handle all states**: Always handle `loading`, `error`, and empty states
3. **Refetch when needed**: Use `refetch()` after mutations to refresh data
4. **Type your filters**: Use TypeScript types for filter objects
5. **Conditional fetching**: Use `skip` option when accountId/etc might be undefined

---

## Examples

### Full CRUD Example

```typescript
import { useAccounts, useApiMutation } from '@/hooks/api';

function AccountsManager() {
  const { data, loading, refetch } = useAccounts();
  const { mutate, loading: creating } = useApiMutation();
  
  const handleCreate = async (accountData: any) => {
    await mutate('/v1/accounts', 'POST', accountData);
    refetch(); // Refresh list after creating
  };
  
  const handleDelete = async (accountId: string) => {
    await mutate(`/v1/accounts/${accountId}`, 'DELETE');
    refetch(); // Refresh list after deleting
  };
  
  return (
    <div>
      <CreateAccountForm onSubmit={handleCreate} />
      {loading ? (
        <LoadingSpinner />
      ) : (
        <AccountsList 
          accounts={data?.accounts || []} 
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
```

---

## Troubleshooting

**Hook returns null data:**
- Check if API server is running
- Verify `VITE_API_URL` is set correctly
- Check browser console for network errors
- Verify user is authenticated

**401 errors:**
- User session expired - they'll be logged out automatically
- API key/token is invalid

**Loading never completes:**
- Check if API endpoint exists
- Verify network connectivity
- Check browser console for CORS errors

---

## Migration from Mock Data

To migrate a page from mock data to API:

1. Replace mock import:
   ```typescript
   // OLD:
   import { mockAccounts } from '@/data/mockAccounts';
   
   // NEW:
   import { useAccounts } from '@/hooks/api';
   ```

2. Use hook in component:
   ```typescript
   // OLD:
   const accounts = mockAccounts;
   
   // NEW:
   const { data, loading, error } = useAccounts();
   const accounts = data?.accounts || [];
   ```

3. Add loading/error states:
   ```typescript
   if (loading) return <LoadingSpinner />;
   if (error) return <ErrorMessage error={error} />;
   ```

4. Done! 🎉

