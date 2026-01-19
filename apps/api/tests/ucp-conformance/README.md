# UCP Conformance Tests

This directory contains tests to verify PayOS compliance with the UCP (Universal Commerce Protocol) specification.

## Overview

The UCP conformance tests validate that PayOS correctly implements:
- Profile discovery (`/.well-known/ucp`)
- Version negotiation (`UCP-Agent` header)
- Payment handler specification
- Token acquisition and settlement flows

## Prerequisites

1. PayOS API server running locally
2. Node.js 18+
3. pnpm installed

## Running Tests

### Quick Test

```bash
# From the apps/api directory
pnpm test tests/ucp-conformance/
```

### Against Running Server

```bash
# Start the API server
pnpm dev

# In another terminal, run conformance tests
API_URL=http://localhost:4000 pnpm test tests/ucp-conformance/
```

### Against Sandbox

```bash
API_URL=https://sandbox.api.payos.com \
PAYOS_API_KEY=pk_test_... \
pnpm test tests/ucp-conformance/
```

## Test Categories

### 1. Profile Discovery Tests

Validates `/.well-known/ucp` endpoint:
- Returns valid JSON
- Contains required `ucp.version` field
- Contains `ucp.services` with PayOS settlement service
- Contains `payment.handlers` with `payos_latam` handler
- Includes proper cache headers

### 2. Version Negotiation Tests

Validates UCP version negotiation:
- Parses `UCP-Agent` header correctly
- Returns negotiated capabilities
- Rejects unsupported versions with proper error

### 3. Payment Handler Tests

Validates PayOS LATAM settlement handler:
- Token acquisition (`POST /v1/ucp/tokens`)
- Settlement execution (`POST /v1/ucp/settle`)
- Settlement status (`GET /v1/ucp/settlements/:id`)
- Error handling (expired tokens, invalid recipients)

### 4. Corridor Tests

Validates settlement corridors:
- USD → BRL via Pix
- USDC → BRL via Pix
- USD → MXN via SPEI
- USDC → MXN via SPEI

## Spec Deviations

The following are known deviations from the UCP specification:

| Deviation | Reason | Status |
|-----------|--------|--------|
| None | - | - |

## External UCP Conformance

To run the official UCP conformance suite (when available):

```bash
# Clone UCP conformance repo
git clone https://github.com/Universal-Commerce-Protocol/conformance

# Configure for PayOS
cd conformance
cp config.example.json config.json
# Edit config.json with PayOS endpoints

# Run conformance suite
npm test
```

## Related Documentation

- [UCP Specification](https://ucp.dev/specification/overview/)
- [PayOS UCP Integration Guide](../../../../docs/ucp/INTEGRATION_GUIDE.md)
- [PayOS UCP Handler Spec](../../../../docs/ucp/handlers/latam/SPEC.md)
- [Epic 43 PRD](../../../../docs/prd/epics/epic-43-ucp-integration.md)
