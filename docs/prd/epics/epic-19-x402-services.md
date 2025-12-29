# Epic 19: PayOS x402 Services (Drink Our Champagne) 🍾

**Status:** Pending
**Phase:** C (Weeks 9-12)
**Priority:** P2
**Total Points:** 22
**Stories:** 0/5 Complete

[← Back to Master PRD](../PayOS_PRD_Master.md)

---

## Overview

Build PayOS's own x402-monetized services that demonstrate the platform capabilities while generating revenue. These services provide real value to LATAM-focused startups.

**Business Value:**
- Demonstrate x402 capabilities with real use cases
- Generate revenue from AI agent ecosystem
- Build LATAM-specific expertise into monetizable services
- Create reference implementations for partners

---

## Services to Build

| Service | Description | Pricing |
|---------|-------------|---------|
| Compliance Check | LATAM identity/document verification | $0.25-0.50/call |
| FX Intelligence | Rate analysis and timing recommendations | $0.05-0.25/call |
| Payment Routing | Optimal route recommendations | $0.15/call |
| Treasury Analysis | AI treasury recommendations | $1.00/call |
| Document Generation | Compliant LATAM payment docs | $0.50/call |

---

## Stories

### Story 19.1: Compliance Check API (5 pts, P1)

Build x402-enabled endpoint that verifies LATAM identity documents and tax IDs.

**Features:**
- CNPJ/CPF validation (Brazil)
- RFC validation (Mexico)
- RUT validation (Chile)
- Real-time verification against government databases
- Compliance scoring

**Endpoint:**
```
POST /x402/services/compliance-check
{
  "country": "BR",
  "document_type": "cnpj",
  "document_number": "12.345.678/0001-90",
  "business_name": "Example Ltd"
}
```

**Response:**
```json
{
  "valid": true,
  "confidence": 0.95,
  "details": {
    "company_status": "active",
    "registration_date": "2020-01-15",
    "compliance_score": 85
  }
}
```

---

### Story 19.2: FX Intelligence API (5 pts, P1)

Provide AI-powered FX rate analysis and timing recommendations.

**Features:**
- Historical rate analysis
- Volatility predictions
- Optimal timing recommendations
- Rate alerts and thresholds
- Multi-currency comparison

**Endpoint:**
```
POST /x402/services/fx-intelligence
{
  "from_currency": "USD",
  "to_currency": "BRL",
  "amount": "10000.00",
  "urgency": "flexible"
}
```

**Response:**
```json
{
  "current_rate": "4.95",
  "recommendation": "wait",
  "optimal_window": "next_3_days",
  "potential_savings": "150.00",
  "confidence": 0.78,
  "analysis": "Rate expected to improve by 1.5% based on central bank policy"
}
```

---

### Story 19.3: Payment Routing API (4 pts, P1)

Recommend optimal payment routes based on cost, speed, and reliability.

**Features:**
- Multi-rail comparison (PIX, SPEI, Wire, etc.)
- Cost optimization
- Speed vs cost tradeoffs
- Reliability scoring
- Compliance considerations

**Endpoint:**
```
POST /x402/services/payment-routing
{
  "from_country": "US",
  "to_country": "BR",
  "amount": "5000.00",
  "currency": "USD",
  "priority": "cost"
}
```

**Response:**
```json
{
  "recommended_route": {
    "rail": "pix",
    "estimated_time": "30_seconds",
    "total_cost": "25.00",
    "reliability_score": 0.99
  },
  "alternatives": [
    {
      "rail": "swift",
      "estimated_time": "2_days",
      "total_cost": "45.00",
      "reliability_score": 0.95
    }
  ],
  "reasoning": "PIX offers 45% cost savings with near-instant settlement"
}
```

---

### Story 19.4: Treasury Analysis API (5 pts, P2)

AI-powered treasury optimization recommendations.

**Features:**
- Cash flow forecasting
- FX hedge recommendations
- Liquidity optimization
- Working capital analysis
- Multi-currency portfolio balancing

**Endpoint:**
```
POST /x402/services/treasury-analysis
{
  "balances": [
    { "currency": "USD", "amount": "100000" },
    { "currency": "BRL", "amount": "250000" },
    { "currency": "MXN", "amount": "500000" }
  ],
  "upcoming_obligations": [...],
  "risk_tolerance": "moderate"
}
```

**Response:**
```json
{
  "recommendations": [
    {
      "action": "convert",
      "from_currency": "BRL",
      "to_currency": "USD",
      "amount": "50000.00",
      "reasoning": "Reduce BRL exposure ahead of elections",
      "expected_benefit": "2500.00",
      "urgency": "high"
    }
  ],
  "risk_analysis": {...},
  "forecast": {...}
}
```

---

### Story 19.5: x402 Services Dashboard (3 pts, P2)

Dashboard for monitoring x402 service usage and revenue.

**Features:**
- Usage metrics by service
- Revenue tracking
- Popular services
- Error rates and performance
- Customer insights
- API key management for services

**Pages:**
- `/dashboard/x402/services` - Overview
- `/dashboard/x402/services/analytics` - Detailed analytics
- `/dashboard/x402/services/settings` - Configuration

---

## Story Summary

| Story | Points | Priority | Status |
|-------|--------|----------|--------|
| 19.1 Compliance Check API | 5 | P1 | Pending |
| 19.2 FX Intelligence API | 5 | P1 | Pending |
| 19.3 Payment Routing API | 4 | P1 | Pending |
| 19.4 Treasury Analysis API | 5 | P2 | Pending |
| 19.5 x402 Services Dashboard | 3 | P2 | Pending |
| **Total** | **22** | | **0/5 Complete** |

---

## Technical Deliverables

### API Endpoints
- `POST /x402/services/compliance-check`
- `POST /x402/services/fx-intelligence`
- `POST /x402/services/payment-routing`
- `POST /x402/services/treasury-analysis`

### Database Schema
```sql
CREATE TABLE x402_service_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  consumer_agent_id UUID REFERENCES agents(id),
  request_data JSONB,
  response_data JSONB,
  price_usd DECIMAL(10,4),
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE x402_service_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  base_price_usd DECIMAL(10,4),
  volume_tiers JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Integration Points
- x402 Gateway for payment collection
- External APIs for compliance/FX data
- Analytics service for usage tracking

---

## Success Criteria

- ✅ All 5 services deployed and monetized
- ✅ Revenue > $1000/month within 3 months
- ✅ 95%+ uptime for all services
- ✅ < 2s average response time
- ✅ 10+ active AI agent consumers
- ✅ Comprehensive documentation and examples

---

## Related Documentation

- **Epic 17:** x402 Gateway Infrastructure (prerequisite)
- **x402 Testing Guide:** `/docs/X402_GEMINI_TESTING_GUIDE.md`
- **x402 Protocol:** `/docs/prd/PayOS_PRD_v1.15.md#epic-17`
