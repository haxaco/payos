# Card Networks API Reference

Complete API reference for Visa VIC and Mastercard Agent Pay integration.

## Base URL

```
Production: https://api.payos.ai/v1/cards
Sandbox:    https://api.sandbox.payos.ai/v1/cards
```

## Authentication

All endpoints require API key authentication:

```
Authorization: Bearer pk_live_...
```

---

## Web Bot Auth Verification

### POST /v1/cards/verify

Verify an AI agent's Web Bot Auth signature.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `method` | string | Yes | HTTP method (GET, POST, etc.) |
| `path` | string | Yes | Request path |
| `headers` | object | No | Request headers |
| `signatureInput` | string | Yes | Signature-Input header value |
| `signature` | string | Yes | Signature header value |
| `network` | string | No | Network to verify against ('visa' or 'mastercard') |

**Response**

```json
{
  "valid": true,
  "network": "visa",
  "keyId": "visa-agent-key-123",
  "agentProvider": "anthropic",
  "verifiedAt": "2025-01-23T10:30:00Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `valid` | boolean | Whether the signature is valid |
| `network` | string | Detected card network |
| `keyId` | string | Key ID from the signature |
| `agentProvider` | string | AI agent provider name |
| `error` | string | Error message if verification failed |
| `verifiedAt` | string | Verification timestamp |

---

## Network Configuration

### GET /v1/cards/networks

Get configured card networks and their status.

**Response**

```json
{
  "networks": {
    "visa": {
      "configured": true,
      "status": "active",
      "accountId": "ca_123",
      "sandbox": false,
      "connectedAt": "2025-01-15T00:00:00Z"
    },
    "mastercard": {
      "configured": false,
      "status": "not_configured",
      "accountId": null,
      "sandbox": true,
      "connectedAt": null
    }
  },
  "capabilities": {
    "webBotAuth": true,
    "paymentInstructions": true,
    "agentRegistration": false,
    "tokenization": true
  }
}
```

### POST /v1/cards/networks/:network/configure

Configure a card network with credentials.

**Path Parameters**

| Parameter | Description |
|-----------|-------------|
| `network` | 'visa' or 'mastercard' |

**Request Body (Visa)**

```json
{
  "api_key": "your_visa_api_key",
  "shared_secret": "your_shared_secret",
  "sandbox": true
}
```

**Request Body (Mastercard)**

```json
{
  "consumer_key": "your_consumer_key",
  "private_key_pem": "-----BEGIN PRIVATE KEY-----...",
  "sandbox": true
}
```

**Response**

```json
{
  "id": "ca_123",
  "message": "Visa Intelligent Commerce configured successfully"
}
```

### POST /v1/cards/networks/:network/test

Test connection to a card network.

**Response**

```json
{
  "success": true
}
```

### DELETE /v1/cards/networks/:network/disconnect

Disconnect a card network.

**Response**

```json
{
  "success": true,
  "message": "visa disconnected successfully"
}
```

---

## Visa Payment Instructions

### POST /v1/cards/visa/instructions

Create a Visa VIC payment instruction.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | Yes | Payment amount |
| `currency` | string | Yes | Currency code (USD, etc.) |
| `merchant.name` | string | Yes | Merchant name |
| `merchant.categoryCode` | string | Yes | MCC code |
| `merchant.country` | string | No | Country code (default: US) |
| `merchant.url` | string | No | Merchant URL |
| `restrictions` | object | No | Payment restrictions |
| `expiresInSeconds` | number | No | Expiration time (default: 900) |
| `metadata` | object | No | Custom metadata |

**Example Request**

```json
{
  "amount": 99.99,
  "currency": "USD",
  "merchant": {
    "name": "My Store",
    "categoryCode": "5411",
    "country": "US"
  },
  "restrictions": {
    "maxAmount": 100,
    "allowedCountries": ["US", "CA"]
  },
  "expiresInSeconds": 900
}
```

**Response**

```json
{
  "instructionId": "vic_instr_123",
  "merchantRef": "payos_abc_1706012345",
  "amount": 99.99,
  "currency": "USD",
  "merchant": {
    "name": "My Store",
    "categoryCode": "5411",
    "country": "US"
  },
  "restrictions": {
    "maxAmount": 100,
    "allowedCountries": ["US", "CA"]
  },
  "status": "active",
  "expiresAt": "2025-01-23T10:45:00Z",
  "createdAt": "2025-01-23T10:30:00Z"
}
```

### GET /v1/cards/visa/instructions

List Visa payment instructions.

**Query Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status |
| `limit` | number | Max results (default: 50, max: 100) |
| `offset` | number | Pagination offset |

**Response**

```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0
  }
}
```

### GET /v1/cards/visa/instructions/:id

Get a specific payment instruction.

---

## Visa Tokens

### POST /v1/cards/visa/tokens

Provision a VTS token for an instruction.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `instructionId` | string | Yes | Payment instruction ID |
| `cardToken` | string | Yes | Card token from payment processor |
| `metadata` | object | No | Custom metadata |

**Response**

```json
{
  "tokenId": "vts_tok_123",
  "instructionId": "vic_instr_123",
  "cardLastFour": "4242",
  "status": "active",
  "expiresAt": "2025-02-23T10:30:00Z",
  "provisionedAt": "2025-01-23T10:30:00Z"
}
```

### GET /v1/cards/visa/tokens

List Visa tokens.

**Query Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status |
| `limit` | number | Max results |
| `offset` | number | Pagination offset |

### GET /v1/cards/visa/tokens/:id

Get a specific token.

### DELETE /v1/cards/visa/tokens/:id

Suspend a Visa token.

**Response**

```json
{
  "success": true,
  "message": "Token suspended"
}
```

---

## Mastercard Agents

### POST /v1/cards/mastercard/agents

Register an agent with Mastercard Agent Pay.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `agentId` | string | Yes | PayOS agent ID |
| `agentName` | string | No | Display name |
| `publicKey` | string | Yes | Agent's public key (PEM) |
| `capabilities` | array | No | Agent capabilities |
| `provider` | string | No | AI provider name |
| `callbackUrl` | string | No | Callback URL |

**Example Request**

```json
{
  "agentId": "agent_123",
  "agentName": "Shopping Assistant",
  "publicKey": "-----BEGIN PUBLIC KEY-----...",
  "capabilities": ["payment", "tokenization"],
  "provider": "anthropic",
  "callbackUrl": "https://myapp.com/mc-callback"
}
```

**Response**

```json
{
  "agentId": "agent_123",
  "mcAgentId": "mc_agent_456",
  "agentName": "Shopping Assistant",
  "publicKey": "-----BEGIN PUBLIC KEY-----...",
  "capabilities": ["payment", "tokenization"],
  "status": "active",
  "provider": "anthropic",
  "callbackUrl": "https://myapp.com/mc-callback",
  "registeredAt": "2025-01-23T10:30:00Z"
}
```

### GET /v1/cards/mastercard/agents

List registered Mastercard agents.

**Response**

```json
{
  "data": [...]
}
```

### GET /v1/cards/mastercard/agents/:id

Get a specific agent registration.

---

## Mastercard Tokens

### POST /v1/cards/mastercard/tokens

Create a Mastercard agentic token with DTVC.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `agentId` | string | Yes | PayOS agent ID |
| `cardToken` | string | Yes | Card token |
| `expiresInSeconds` | number | No | Expiration (default: 3600) |
| `metadata` | object | No | Custom metadata |

**Response**

```json
{
  "tokenReference": "mc_tok_789",
  "mcAgentId": "mc_agent_456",
  "dtvc": "123456",
  "cardLastFour": "4242",
  "status": "active",
  "expiresAt": "2025-01-23T11:30:00Z"
}
```

### GET /v1/cards/mastercard/tokens

List Mastercard tokens.

**Query Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status |
| `limit` | number | Max results |
| `offset` | number | Pagination offset |

### GET /v1/cards/mastercard/tokens/:id

Get a specific token, optionally refreshing the DTVC.

**Query Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `refresh` | boolean | Refresh DTVC if true |

### DELETE /v1/cards/mastercard/tokens/:id

Revoke a Mastercard token.

**Response**

```json
{
  "success": true,
  "message": "Token revoked"
}
```

---

## Transactions

### GET /v1/cards/transactions

List card network transactions.

**Query Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `network` | string | Filter by network |
| `status` | string | Filter by status |
| `limit` | number | Max results |
| `offset` | number | Pagination offset |

**Response**

```json
{
  "data": [
    {
      "id": "tx_123",
      "network": "visa",
      "status": "completed",
      "amount": 99.99,
      "currency": "USD",
      "merchantName": "My Store",
      "createdAt": "2025-01-23T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 50,
    "limit": 50,
    "offset": 0
  }
}
```

### GET /v1/cards/transactions/:id

Get a specific transaction.

---

## Analytics

### GET /v1/cards/analytics

Get comprehensive card network analytics.

**Query Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `days` | number | Days to analyze (default: 30) |

**Response**

```json
{
  "verifications": {
    "total": 1500,
    "successful": 1450,
    "successRate": 97,
    "byNetwork": {
      "visa": 1000,
      "mastercard": 500
    },
    "byProvider": {
      "anthropic": 800,
      "openai": 500,
      "google": 200
    }
  },
  "transactions": {
    "total": 1200,
    "volume": 125000.50,
    "byStatus": {
      "completed": 1150,
      "pending": 30,
      "failed": 20
    },
    "byNetwork": {
      "visa": 800,
      "mastercard": 400
    }
  },
  "recentTransactions": [...],
  "period": {
    "days": 30,
    "from": "2024-12-24T00:00:00Z",
    "to": "2025-01-23T23:59:59Z"
  }
}
```

### GET /v1/cards/verifications/stats

Get verification statistics only.

**Query Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `days` | number | Days to analyze (default: 30) |

**Response**

```json
{
  "total": 1500,
  "successful": 1450,
  "failed": 50,
  "byNetwork": {
    "visa": 1000,
    "mastercard": 500
  },
  "byProvider": {
    "anthropic": 800,
    "openai": 500
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "details": { ... }
}
```

### Common Error Codes

| Status | Error | Description |
|--------|-------|-------------|
| 400 | ValidationError | Invalid request parameters |
| 401 | UnauthorizedError | Invalid or missing API key |
| 403 | ForbiddenError | Insufficient permissions |
| 404 | NotFoundError | Resource not found |
| 500 | ApiError | Internal server error |
