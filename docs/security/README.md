# PayOS Security Documentation

This directory contains security documentation, best practices, and testing procedures for PayOS. Security is a critical aspect of the PayOS platform, with a focus on multi-tenant isolation, data protection, and compliance.

## Overview

PayOS implements defense-in-depth security with multiple layers of protection:

- **Multi-tenant isolation** via Row-Level Security (RLS)
- **Triple authentication** (API keys, JWT, agent tokens)
- **Encrypted communications** (HTTPS/TLS)
- **Rate limiting** and DDoS protection
- **Audit logging** for all critical operations
- **KYC/KYB/KYA verification** tiers
- **Security headers** and CORS policies

## Documentation Index

### Core Security Documents

| Document | Description | Purpose |
|----------|-------------|---------|
| [RLS_STRATEGY.md](RLS_STRATEGY.md) | Row-Level Security implementation | Multi-tenant data isolation |
| [RLS_TESTING.md](RLS_TESTING.md) | RLS testing procedures | Verify tenant isolation |
| [security-review.md](security-review.md) | Security review and audit | Security posture assessment |

### Migration & Incident Response

| Document | Description | Purpose |
|----------|-------------|---------|
| [key-migration.md](key-migration.md) | API key migration guide | Migrate to new key system |
| [api-key-migration-summary.md](api-key-migration-summary.md) | API key migration summary | Migration status and results |
| [incident-response.md](incident-response.md) | Incident response procedures | Handle security incidents |
| [fix-checklist.md](fix-checklist.md) | Security fix checklist | Systematic fix procedures |

## Quick Start

### For Developers

1. Read [RLS_STRATEGY.md](RLS_STRATEGY.md) to understand multi-tenancy
2. Follow [RLS_TESTING.md](RLS_TESTING.md) when adding new tables
3. Review [security-review.md](security-review.md) for security requirements

### For Security Auditors

1. Start with [security-review.md](security-review.md) for security posture
2. Review [RLS_STRATEGY.md](RLS_STRATEGY.md) for isolation strategy
3. Use [RLS_TESTING.md](RLS_TESTING.md) to verify controls
4. Check [incident-response.md](incident-response.md) for procedures

## Row-Level Security (RLS)

### What is RLS?

Row-Level Security is PostgreSQL's built-in mechanism for enforcing access control at the row level. In PayOS, every table has RLS policies that ensure users can only access data from their own tenant.

**Key principle:** No matter how the application queries the database, PostgreSQL enforces tenant isolation.

### RLS Implementation

See [RLS_STRATEGY.md](RLS_STRATEGY.md) for comprehensive details.

**Every table must:**
1. Have `tenant_id` column (foreign key to `tenants` table)
2. Have RLS enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
3. Have policies for SELECT, INSERT, UPDATE, DELETE
4. Be tested for cross-tenant leaks

**Example policy:**
```sql
-- Enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Policy for tenant isolation
CREATE POLICY tenant_isolation_policy ON accounts
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

### RLS Testing

See [RLS_TESTING.md](RLS_TESTING.md) for testing procedures.

**Test checklist:**
- [ ] Verify user can access own tenant's data
- [ ] Verify user cannot access other tenant's data
- [ ] Test with multiple tenants
- [ ] Test with multiple user roles
- [ ] Test edge cases (NULL tenant_id, deleted tenants)

**Automated testing:**
```bash
# Run RLS coverage check
pnpm --filter @payos/api check:rls

# Run integration tests (includes RLS tests)
INTEGRATION=true pnpm --filter @payos/api test
```

## Authentication & Authorization

### Triple Authentication System

PayOS supports three authentication methods:

#### 1. API Keys

**Format:** `pk_test_*` (test) or `pk_live_*` (live)

**Storage:** Hashed with prefix for lookup

**Use case:** Partner integrations, SDK usage

**Security:**
- Argon2 hashing
- Constant-time comparison
- Environment separation (test/live)
- Rotation support

#### 2. JWT Sessions

**Provider:** Supabase Auth

**Format:** Standard JWT tokens

**Use case:** Dashboard login, user sessions

**Security:**
- 15-minute token expiry
- Auto-refresh at 14 minutes
- Secure cookie storage
- CSRF protection

#### 3. Agent Tokens

**Format:** `agent_*`

**Storage:** Hashed with prefix for lookup

**Use case:** AI agent authentication

**Security:**
- Argon2 hashing
- KYA tier validation
- Spending limits
- Activity monitoring

### Authorization Layers

**Layer 1: Authentication**
```typescript
// Verify credentials and extract tenant
const ctx = await authMiddleware(c);
// ctx.tenantId, ctx.actorType, ctx.userId/apiKeyId/agentId
```

**Layer 2: RLS Policies**
```sql
-- PostgreSQL enforces tenant isolation
-- No application code can bypass this
```

**Layer 3: Application Logic**
```typescript
// Check role permissions
if (ctx.userRole === 'viewer') {
  throw new ForbiddenError('Insufficient permissions');
}

// Check KYA tier
if (ctx.kyaTier < 2) {
  throw new ForbiddenError('KYA tier 2+ required');
}
```

## API Key Security

### Key Generation

```typescript
// Generate new API key
const prefix = env === 'test' ? 'pk_test_' : 'pk_live_';
const randomPart = crypto.randomBytes(24).toString('base64url');
const apiKey = prefix + randomPart;

// Hash for storage (Argon2)
const hash = await hashApiKey(apiKey);

// Store: prefix + hash
await db.insert({ prefix, hash, environment: env });
```

### Key Migration

See [key-migration.md](key-migration.md) and [api-key-migration-summary.md](api-key-migration-summary.md).

**Migration completed:** All API keys migrated to new hashed format with environment support.

### Key Rotation

**Best practices:**
1. Generate new key
2. Update applications with new key
3. Test new key
4. Revoke old key
5. Monitor for old key usage

**Rotation frequency:**
- Development: Every 90 days
- Production: Every 90 days or on compromise

## Security Headers

### Implemented Headers

```typescript
{
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), camera=(), microphone=()'
}
```

See `apps/api/src/middleware/security.ts` for implementation.

## Rate Limiting

### API Rate Limits

**General API:**
- 100 requests/minute per IP
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

**Auth endpoints:**
- 5 requests/minute per IP
- Stricter limits to prevent brute force

**Production (planned):**
- Per-API-key limits
- Burst allowances
- Redis-backed rate limiting

See `apps/api/src/middleware/rate-limit.ts` for implementation.

## CORS (Cross-Origin Resource Sharing)

### Configuration

```typescript
{
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}
```

**Development:** `http://localhost:5173`, `http://localhost:3000`

**Production:** Configured via `CORS_ORIGINS` environment variable

## Audit Logging

### What We Log

**Authentication events:**
- Login attempts (success/failure)
- API key usage
- Token refresh
- Permission denied errors

**Critical operations:**
- Account creation/deletion
- Agent registration
- Large transfers (>$10,000)
- Settings changes
- User role changes

**Security events:**
- Failed authentication attempts
- Rate limit violations
- Suspicious activity patterns
- RLS policy violations

### Log Format

```json
{
  "timestamp": "2025-12-29T12:00:00Z",
  "level": "warn",
  "event": "auth_failed",
  "tenantId": "tenant_123",
  "userId": "user_456",
  "ip": "192.168.1.1",
  "details": {
    "reason": "invalid_credentials",
    "attempts": 3
  }
}
```

## Incident Response

See [incident-response.md](incident-response.md) for detailed procedures.

### Incident Levels

**Level 1 (Critical):**
- Data breach
- Authentication bypass
- RLS failure
- Production outage

**Level 2 (High):**
- Failed intrusion attempt
- DDoS attack
- Suspicious activity pattern

**Level 3 (Medium):**
- Repeated failed logins
- Rate limit violations
- Configuration errors

**Level 4 (Low):**
- Minor security warnings
- Audit findings

### Response Procedures

**Immediate actions:**
1. Assess severity and scope
2. Contain the incident
3. Notify stakeholders
4. Preserve evidence
5. Begin remediation

**Post-incident:**
1. Root cause analysis
2. Implement fixes
3. Update documentation
4. Conduct retrospective
5. Update incident response plan

## Compliance & Verification

### KYC/KYB/KYA Tiers

**KYC (Know Your Customer) - Accounts:**
- Tier 0: No verification (<$100/day)
- Tier 1: Email verified (<$1,000/day)
- Tier 2: ID verified (<$10,000/day)
- Tier 3: Full verification (unlimited)

**KYB (Know Your Business) - Merchants:**
- Tier 0: Basic info
- Tier 1: Business registration
- Tier 2: Financial statements
- Tier 3: Full audit

**KYA (Know Your Agent) - AI Agents:**
- Tier 0: Basic registration
- Tier 1: Source code review
- Tier 2: Formal verification
- Tier 3: Certified secure

### Compliance Flags

System tracks compliance for:
- AML (Anti-Money Laundering)
- KYC/KYB/KYA verification
- Sanctions screening
- PEP (Politically Exposed Persons)
- High-risk jurisdictions

## Security Testing

### Automated Testing

```bash
# Run security-focused tests
pnpm --filter @payos/api test tests/integration/security

# Check RLS coverage
pnpm --filter @payos/api check:rls

# Run full test suite
pnpm test
```

### Manual Security Testing

**Checklist:**
- [ ] Test authentication bypasses
- [ ] Test cross-tenant data access
- [ ] Test SQL injection
- [ ] Test XSS vulnerabilities
- [ ] Test CSRF protection
- [ ] Test rate limiting
- [ ] Test CORS configuration
- [ ] Test API key security
- [ ] Test session management
- [ ] Test error messages (no info leak)

### Penetration Testing

**Recommended frequency:** Annually or after major changes

**Scope:**
- Authentication and authorization
- API security
- Database security
- Infrastructure security
- Client-side security

## Security Checklist for New Features

When implementing new features:

- [ ] Add RLS policies to new tables
- [ ] Test RLS with multiple tenants
- [ ] Validate all user inputs
- [ ] Use parameterized queries
- [ ] Check authorization at all layers
- [ ] Add audit logging for critical operations
- [ ] Rate limit new endpoints
- [ ] Add security headers
- [ ] Test for common vulnerabilities (OWASP Top 10)
- [ ] Update security documentation
- [ ] Review with security team

## Security Fix Checklist

See [fix-checklist.md](fix-checklist.md) for systematic fix procedures.

**When fixing security issues:**
1. Assess severity and impact
2. Develop fix in private branch
3. Test thoroughly (unit + integration)
4. Review with security team
5. Deploy to staging
6. Verify fix in staging
7. Deploy to production
8. Monitor for issues
9. Document fix and lessons learned
10. Update security documentation

## Related Documentation

- [Architecture Documentation](../architecture/) - System architecture
- [RLS Strategy](RLS_STRATEGY.md) - Multi-tenant isolation
- [RLS Testing](RLS_TESTING.md) - Testing procedures
- [Deployment Documentation](../deployment/) - Production deployment
- [PRD](../prd/PayOS_PRD_Development.md) - Epic 16 (Security)

## Security Contacts

**For security issues:**
1. Do not create public GitHub issues
2. Email security team (configure in production)
3. Follow responsible disclosure

**For security questions:**
1. Review documentation first
2. Check with team lead
3. Consult security documentation

---

**Last Updated:** December 29, 2025
**Maintained By:** PayOS Team

For the main documentation index, see [/docs/README.md](../README.md)
