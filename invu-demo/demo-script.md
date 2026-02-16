# Invu POS Demo — Presenter Guide

**Duration:** 25-30 minutes
**Audience:** Rafi Turgman (Co-Founder, Invu POS)
**Goal:** Show that Sly makes every Invu POS merchant agent-discoverable and agent-payable — Invu becomes the payment processor for AI commerce in Central America.

---

## Pre-Demo Setup

```bash
# 1. Seed the demo data
cd apps/api && pnpm tsx ../../invu-demo/seed-invu-demo.ts

# 2. Start API server
pnpm --filter @sly/api dev

# 3. Start dashboard
pnpm --filter @sly/web dev

# 4. Verify discovery endpoint
curl http://localhost:4000/.well-known/ucp | jq '.payment.handlers'
# Should show both "payos_latam" and "invu"
```

**Have ready:**
- Terminal with API running
- Dashboard open at localhost:3000
- A second terminal for live API calls
- This script on a second screen

---

## Act 1: Discovery (5 min)

**The hook:** "What if any AI agent in the world could discover your merchants and pay them — without any custom integration?"

### Step 1.1: Show the discovery endpoint

```bash
# This is a public, unauthenticated endpoint
curl -s http://localhost:4000/.well-known/ucp | jq
```

**Talk through the response:**
- `payment.handlers` — Invu POS appears as a registered payment processor
- `supported_currencies` — USD and PAB (Panamanian Balboa)
- `supported_corridors` — shows how payments flow through Invu POS
- `signing_keys` — cryptographic keys for webhook verification

**Key line:** "This is a standard. Any AI agent — Claude, GPT, a custom bot — can hit this endpoint, see that Invu POS is a payment handler, and know exactly how to pay your merchants. No SDK integration needed. No custom API. Just a URL."

### Step 1.2: Agent discovers Invu POS (MCP tool)

If showing via Claude/MCP:
```
> Use ucp_discover to discover what payment methods are available at our demo server
```

The agent will call `ucp_discover` and report back what Invu supports.

---

## Act 2: Single Restaurant Order (8 min)

**The transition:** "Now let's see what this looks like in practice. The AI agent is going to order lunch from one of your restaurants."

### Step 2.1: Create the agent (or show existing)

Show the Invu Concierge Agent in the dashboard:
- Navigate to **Agents** page
- Show "Invu Concierge Agent" with KYA Tier 1
- Show the wallet with 10,000 USDC balance
- Show the spending mandate: $2,500 authorized

**Key line:** "This agent has been verified (KYA Tier 1), has a funded wallet, and a spending limit. It can order autonomously within those bounds — no human approval needed for orders under the limit."

### Step 2.2: Agent creates a checkout

Via API or MCP:

```bash
curl -X POST http://localhost:4000/v1/ucp/checkouts \
  -H "Authorization: Bearer pk_test_invu_demo_2026" \
  -H "Content-Type: application/json" \
  -d '{
    "currency": "USD",
    "checkout_type": "digital",
    "line_items": [
      {
        "id": "prod_cev_001",
        "name": "Ceviche Clásico",
        "quantity": 2,
        "unit_price": 1450,
        "total_price": 2900
      },
      {
        "id": "prod_cev_005",
        "name": "Limonada de Coco",
        "quantity": 3,
        "unit_price": 550,
        "total_price": 1650
      }
    ],
    "buyer": {
      "email": "corporate@invupos.com",
      "name": "Invu Corporate Ordering"
    },
    "payment_instruments": [{
      "id": "pi_invu_live_001",
      "handler": "invu",
      "type": "invu_pos",
      "brand": "Invu POS"
    }],
    "agent_id": "00000000-1a00-de00-a9e0-000000000001",
    "metadata": {
      "merchant_name": "La Cevichería del Rey",
      "merchant_id": "invu_merch_002"
    }
  }'
```

**Walk through the response:**
- Status is `ready_for_complete` (has payment instrument + buyer)
- `payment_config.handlers` shows `["invu"]`
- Line items with prices
- Totals calculated

### Step 2.3: Complete the checkout

```bash
curl -X POST http://localhost:4000/v1/ucp/checkouts/{CHECKOUT_ID}/complete \
  -H "Authorization: Bearer pk_test_invu_demo_2026"
```

**Key line:** "That's it. The agent ordered ceviche and lemonade from La Cevichería, Invu POS processed the payment, and the order is confirmed. Three API calls: discover, create checkout, complete. The entire flow took under 2 seconds."

### Step 2.4: Show in dashboard

- Navigate to **Agentic Payments** → checkout history
- Show the completed order with Invu branding
- Show agent spending tracked

---

## Act 3: Batch Ordering — The Scale Play (7 min)

**The transition:** "OK, one restaurant is nice. But what about a corporate event? The agent needs to order from 5 of your restaurants at the same time."

### Step 3.1: Batch checkout

```bash
curl -X POST http://localhost:4000/v1/ucp/checkouts/batch \
  -H "Authorization: Bearer pk_test_invu_demo_2026" \
  -H "Content-Type: application/json" \
  -d '{
    "checkouts": [
      {
        "currency": "USD",
        "checkout_type": "digital",
        "line_items": [
          {"id": "prod_kk_001", "name": "Original Glazed Dozen", "quantity": 5, "unit_price": 1299, "total_price": 6495}
        ],
        "buyer": {"email": "events@invupos.com", "name": "Corporate Event"},
        "payment_instruments": [{"id": "pi_invu_batch_1", "handler": "invu", "type": "invu_pos"}],
        "metadata": {"merchant_name": "Krispy Kreme Panamá"}
      },
      {
        "currency": "USD",
        "checkout_type": "digital",
        "line_items": [
          {"id": "prod_cu_001", "name": "Geisha Pourover", "quantity": 10, "unit_price": 950, "total_price": 9500}
        ],
        "buyer": {"email": "events@invupos.com", "name": "Corporate Event"},
        "payment_instruments": [{"id": "pi_invu_batch_2", "handler": "invu", "type": "invu_pos"}],
        "metadata": {"merchant_name": "Café Unido"}
      },
      {
        "currency": "USD",
        "checkout_type": "digital",
        "line_items": [
          {"id": "prod_trap_001", "name": "Sancocho Panameño", "quantity": 15, "unit_price": 1050, "total_price": 15750}
        ],
        "buyer": {"email": "events@invupos.com", "name": "Corporate Event"},
        "payment_instruments": [{"id": "pi_invu_batch_3", "handler": "invu", "type": "invu_pos"}],
        "metadata": {"merchant_name": "El Trapiche"}
      },
      {
        "currency": "USD",
        "checkout_type": "digital",
        "line_items": [
          {"id": "prod_cj_001", "name": "Casco Old Fashioned", "quantity": 20, "unit_price": 1400, "total_price": 28000},
          {"id": "prod_cj_004", "name": "Tabla de Quesos", "quantity": 5, "unit_price": 1800, "total_price": 9000}
        ],
        "buyer": {"email": "events@invupos.com", "name": "Corporate Event"},
        "payment_instruments": [{"id": "pi_invu_batch_4", "handler": "invu", "type": "invu_pos"}],
        "metadata": {"merchant_name": "Casa Jaguar Bar"}
      },
      {
        "currency": "USD",
        "checkout_type": "digital",
        "line_items": [
          {"id": "prod_mai_001", "name": "Tasting Menu (7 courses)", "quantity": 4, "unit_price": 8500, "total_price": 34000}
        ],
        "buyer": {"email": "events@invupos.com", "name": "Corporate Event"},
        "payment_instruments": [{"id": "pi_invu_batch_5", "handler": "invu", "type": "invu_pos"}],
        "metadata": {"merchant_name": "Maito Restaurante"}
      }
    ]
  }'
```

**Key line:** "One API call. Five restaurants. Five separate orders. Each restaurant gets their own order with their own settlement. The agent just catered a 50-person corporate event across your entire merchant network in under 3 seconds."

### Step 3.2: Show the results

- Show 5 completed checkouts in the dashboard
- Show total spending against the mandate budget
- Point out: "Each restaurant sees this as a normal Invu POS transaction. They don't need to know an AI agent placed the order."

---

## Act 4: Safety & Controls (5 min)

**The transition:** "You're probably thinking — what stops the agent from going crazy? Everything."

### Step 4.1: Show the mandate

- Navigate to mandate details
- Show authorized amount vs. spent amount
- Show remaining budget

**Key line:** "The agent has a $2,500 daily mandate. Once it's spent, it's blocked. No exceptions. This is enforced at the infrastructure level, not application logic."

### Step 4.2: Show KYA verification

- Show agent KYA tier in dashboard
- Explain the tier system: "Tier 1 is $500 per transaction, $2,500/day. Your bigger franchise clients can upgrade agents to Tier 2 or 3 for higher limits."

### Step 4.3: Audit trail

- Show the complete audit trail: every checkout, every payment, every status change
- "Full transparency. You know exactly what every agent did, when, and how much it spent."

---

## Act 5: The Vision (5 min)

**Close with the bigger picture.** No live demo needed — just conversation.

**Talking points:**

1. **Every Invu POS merchant becomes agent-ready overnight.** You flip a switch, and any AI agent can order from any of your merchants. No integration work per merchant.

2. **New revenue channel.** Corporate AI assistants, delivery bots, hotel concierge agents — they all generate new order volume flowing through your POS.

3. **Cross-border expansion.** When you expand to Costa Rica and beyond, Sly handles the cross-border settlement. Stablecoins + local rails (Pix, SPEI when you enter Mexico).

4. **Franchise treasury.** Your franchise clients can use money streaming for real-time royalty payments instead of monthly reconciliation.

5. **Your SDK + our SDK.** Invu POS's API for catalog data + Sly's SDK for payment orchestration = a complete agent commerce platform for LATAM.

**Closing line:** "You're not just a POS anymore. You're the payment rail for the AI economy in Central America. And we're the infrastructure that makes it work."

---

## Backup: Quick Recovery Plays

**If the API isn't responding:**
```bash
pnpm --filter @sly/api dev
```

**If seed data is missing:**
```bash
cd apps/api && pnpm tsx ../../invu-demo/seed-invu-demo.ts
```

**If checkout creation fails:**
- Check the error response — most likely missing `tenant_id` context
- Fall back to showing the pre-seeded checkouts in the dashboard

**If he asks "when can we go live?"**
- "We can have sandbox integration running within 2 weeks. Production-ready within 6-8 weeks depending on your compliance requirements."

**If he asks about pricing:**
- "Transaction-based pricing — we take a small percentage of each settlement. No platform fees, no per-merchant charges. The more volume your merchants process through agents, the better the unit economics for both of us."
