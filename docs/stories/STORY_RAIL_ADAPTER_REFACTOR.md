# Story: Rail Adapter Extensibility Refactor

## Status: Backlog (Trigger: When adding new rail)

## Context

The current rail adapter implementation (Epic 27, Story 27.3) works well for the 5 existing rails but has hardcoded elements that make adding new rails require code changes.

## Current Limitations

1. **Hardcoded `RailId` type** - Union type requires TypeScript changes
2. **Hardcoded switch statement** in `getAdapter()` - Each new rail needs a case
3. **No config-driven factory** - Can't add rails via database/env config
4. **Mock adapters only** - Real API integrations not implemented

## When to Implement

Trigger this story when:
- Adding 6th+ rail
- Need to add rails dynamically (partner self-service)
- Moving from sandbox to production rails

## Proposed Solution

```typescript
// Config-driven adapter registration
interface RailConfig {
  id: string;                    // Dynamic, not union type
  name: string;
  type: 'mock' | 'circle' | 'pix' | 'spei' | 'custom';
  credentials?: Record<string, string>;
  sandbox: boolean;
  fees: { percentage: number; fixed: number };
  processingTimeMs: number;
  supportedCurrencies: string[];
}

// Factory pattern
class RailAdapterFactory {
  static create(config: RailConfig): RailAdapter {
    switch (config.type) {
      case 'mock': return new MockRailAdapter(config);
      case 'circle': return new CircleAdapter(config);
      case 'pix': return new PixAdapter(config);
      // New rails just need a new case + adapter class
    }
  }
}

// Load from database
const configs = await db.from('rail_configs').select('*');
for (const config of configs) {
  registerAdapter(config.id, RailAdapterFactory.create(config));
}
```

## Acceptance Criteria

- [ ] Remove hardcoded `RailId` union type
- [ ] Config-driven adapter instantiation
- [ ] Database table for rail configurations
- [ ] Admin UI to enable/disable rails
- [ ] Unit tests for adapter factory
- [ ] Integration tests for each real adapter

## Estimates

- **Points**: 5
- **Dependencies**: Real API credentials for target rails

## Files to Modify

- `apps/api/src/services/rail-adapters/types.ts`
- `apps/api/src/services/rail-adapters/mock-adapter.ts`
- New: `apps/api/src/services/rail-adapters/factory.ts`
- New: `apps/api/src/services/rail-adapters/circle-adapter.ts` (real)
- New migration for `rail_configs` table

## Related

- Epic 27: Settlement Infrastructure Hardening
- Story 27.3: Reconciliation Engine (current implementation)

