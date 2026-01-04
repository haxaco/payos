# Story 28.1: Simulation Data Model and Base API - COMPLETE

**Status**: ✅ COMPLETE  
**Points**: 3  
**Priority**: P0  
**Completed**: January 4, 2026

## Summary

Created the foundational data model and base API structure for the PayOS Simulation Engine (Epic 28). This enables AI agents to "dry run" any payment action before committing real funds.

## What Was Built

### 1. Database Schema (`simulations` table)

```sql
CREATE TABLE simulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Action details
    action_type TEXT NOT NULL CHECK (action_type IN ('transfer', 'refund', 'stream', 'batch')),
    action_payload JSONB NOT NULL,
    
    -- Simulation lifecycle
    status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'completed', 'failed', 'executed', 'expired')),
    
    -- Results
    can_execute BOOLEAN DEFAULT FALSE,
    preview JSONB,
    warnings JSONB DEFAULT '[]'::jsonb,
    errors JSONB DEFAULT '[]'::jsonb,
    
    -- Execution tracking
    executed BOOLEAN DEFAULT FALSE,
    executed_at TIMESTAMPTZ,
    execution_result_id UUID,
    execution_result_type TEXT,
    variance JSONB,
    
    -- TTL (1 hour default)
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Features:**
- RLS policies for tenant isolation
- Indexes for efficient queries (tenant_id, status, expires_at, action_type)
- Support for all action types: transfer, refund, stream, batch

### 2. API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/simulate` | POST | Create a simulation |
| `/v1/simulate/:id` | GET | Get simulation details |
| `/v1/simulate/:id/execute` | POST | Execute validated simulation |

### 3. Transfer Simulation (First Implementation)

The transfer simulation provides:

**Preview Data:**
```json
{
  "source": {
    "account_id": "acc_123",
    "amount": "100.00",
    "currency": "USDC",
    "balance_before": "5000.00",
    "balance_after": "4900.00"
  },
  "destination": {
    "account_id": "acc_456",
    "amount": "495.00",
    "currency": "BRL"
  },
  "fx": {
    "rate": "4.95",
    "spread": "0.35%",
    "rate_locked": false
  },
  "fees": {
    "platform_fee": "0.29",
    "fx_fee": "0.00",
    "rail_fee": "0.50",
    "total": "0.79"
  },
  "timing": {
    "estimated_duration_seconds": 30,
    "estimated_arrival": "2026-01-04T12:00:30Z",
    "rail": "pix"
  }
}
```

**Warnings Generated:**
- `LOW_BALANCE_AFTER` - Balance will fall below threshold
- `LARGE_TRANSFER` - Transfer exceeds typical amount

**Errors Generated:**
- `SOURCE_ACCOUNT_NOT_FOUND`
- `DESTINATION_ACCOUNT_NOT_FOUND`
- `SOURCE_ACCOUNT_SUSPENDED`
- `DESTINATION_ACCOUNT_SUSPENDED`
- `INSUFFICIENT_BALANCE` (with shortfall details)

### 4. New Error Codes

Added to `@payos/types`:

```typescript
// Simulation errors
SIMULATION_EXPIRED = 'SIMULATION_EXPIRED',      // 410
SIMULATION_CANNOT_EXECUTE = 'SIMULATION_CANNOT_EXECUTE', // 400
SIMULATION_STALE = 'SIMULATION_STALE',          // 409
SIMULATION_NOT_FOUND = 'SIMULATION_NOT_FOUND',  // 404
NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',            // 501
VALIDATION_FAILED = 'VALIDATION_FAILED',        // 400
```

### 5. Simulation Lifecycle

```
[Created] → pending → completed → executed
                   ↘ failed
                   ↘ expired (after 1 hour)
```

## Files Created/Modified

| File | Action |
|------|--------|
| `apps/api/src/routes/simulations.ts` | Created |
| `apps/api/src/app.ts` | Modified (added route) |
| `packages/types/src/errors.ts` | Modified (added error codes) |
| `supabase/migrations/*_create_simulations_table.sql` | Created |
| `docs/guides/CLAUDE_MCP_TESTING_GUIDE.md` | Created |

## Usage Example

### Create a Simulation

```bash
curl -X POST http://localhost:4000/v1/simulate \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "transfer",
    "payload": {
      "from_account_id": "acc_123",
      "to_account_id": "acc_456",
      "amount": "100.00",
      "currency": "USDC"
    }
  }'
```

### Response

```json
{
  "success": true,
  "data": {
    "simulation_id": "sim_abc123",
    "status": "completed",
    "can_execute": true,
    "preview": { ... },
    "warnings": [],
    "errors": [],
    "expires_at": "2026-01-04T13:00:00Z",
    "execute_url": "/v1/simulate/sim_abc123/execute"
  }
}
```

### Execute the Simulation

```bash
curl -X POST http://localhost:4000/v1/simulate/sim_abc123/execute \
  -H "Authorization: Bearer $API_KEY"
```

## Acceptance Criteria

- [x] Simulations table created with RLS
- [x] Base API endpoints return correct structure
- [x] Simulation lifecycle states work correctly
- [x] Request validation catches invalid payloads
- [x] TypeScript types defined for simulation
- [x] Simulations expire after 1 hour
- [x] Idempotent execution (double-execute returns same result)

## What's Next

| Story | Description |
|-------|-------------|
| **28.2** | Transfer simulation with FX/fee preview (enhances this) |
| **28.3** | Batch simulation endpoint |
| **28.4** | Simulation-to-execution flow (variance calculation) |
| **28.5** | Refund simulation |
| **28.6** | Stream simulation (cost projection) |

## Claude MCP Testing

A comprehensive guide for testing PayOS with Claude Desktop was also created at:
`/docs/guides/CLAUDE_MCP_TESTING_GUIDE.md`

This guide covers:
- Setting up the MCP server with Claude Desktop
- Configuration for sandbox/testnet/production
- Demo script for showing AI payments
- Troubleshooting common issues

