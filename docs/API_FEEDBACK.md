# API & Backend Feedback Report
**Date:** January 6, 2026
**Topic:** Frontend Integration Observations & Issues

This document summarizes issues, missing features, and stability observations encountered during the development of Part 1 (Wallets) and Part 3 (AP2 Mandate Actions).

## 1. Critical Missing Features

### Virtual Debit Cards (AP2)
- **Issue:** There is no native API support for Virtual Debit Cards (VDC).
- **Current Workaround:** We are mocking VDC functionality by storing card details (PAN, Expiry, CVV) in the `metadata` field of the Mandate object.
- **Request:** Implement dedicated endpoints:
  - `POST /ap2/mandates/:id/issue-card` to issue a card.
  - `GET /ap2/mandates/:id/card-details` to securely retrieve card info (sensitive data should not be in standard list responses).

### Wallet Management
- **Issue:** Wallet creation requires an `ownerAccountId`. The current UI defaults to fetching the first available account because there is no easy way to query "my accounts" in a user-centric way or the relationship is unclear.
- **Request:**
  - Clarify the relationship between Users and Accounts.
  - If a user can have multiple accounts, provide a simplified endpoint to list "linked accounts" for account selection dropdowns.
- **Issue:** The "Deposit" / Top-up functionality is visual-only.
- **Request:** Implement `POST /v1/wallets/:id/deposit` (or similar) to facilitate funding for testing/sandbox environments.

## 2. Stability & Infrastructure

### Rate Limiting (429 Errors)
- **Observation:** Frequent `429 Too Many Requests` errors were encountered during frontend automated verification (browser subagent).
- **Impact:** Flaky tests and potential user friction if multiple components fetch data simultaneously.
- **Request:** Increase rate limits for the sandbox/dev environment or implement smarter batching/caching on the backend.

### Authentication
- **Observation:** Encountered `[AuthApiError]: Invalid Refresh Token` requiring manual server restarts and browser refresh to resolve.
- **Impact:** Disrupts development flow.
- **Request:** Improve session resiliency and error messaging for expired sessions.

## 3. Data & Types

### Date Formatting
- **Observation:** Inconsistencies in date formats (ISO strings vs timestamps) caused initial parsing errors in the frontend components (specifically for Mandate expiry).
- **Request:** Standardize all date fields to ISO 8601 strings across all endpoints (Wallets, Mandates, Transactions).

### Type Definitions
- **Observation:** Some API response types didn't match the `@payos/api-client` definitions exactly (e.g., nested `data` objects vs flat responses), requiring frontend adjustments.
- **Request:** Ensure the `@payos/api-client` package is kept in strict sync with the deployed API version.

## 4. Dashboard & Analytics
### Balance Aggregation
- **Issue:** The Dashboard "Total Balance" requires summing balances from all user accounts client-side. There is no aggregate endpoint.
- **Request:** Implement `GET /accounts/aggregate-balance` to return total value across all accounts (and supported currencies) in one call.

### Rate Limit Visibility
- **Issue:** The existing API client hides HTTP response headers, making it impossible to read standard rate limit headers (`X-RateLimit-Remaining`) for the UI indicator.
- **Request:** Expose response metadata/headers in the API client or providing a dedicated endpoint (e.g., `GET /meta/rate-limits`) for health checks.

## 5. Realtime Capabilities
### WebSockets / Subscriptions
- **Issue:** No WebSocket or Server-Sent Events (SSE) endpoints exist for Transfer updates. We are currently using **short-polling (5s interval)** to simulate live updates.
- **Request:** Implement Supabase Realtime channels or standard WebSockets for:
  - `transfers:update` (status changes)
  - `compliance:alert` (new flags)
  - `accounts:balance` (balance updates)
