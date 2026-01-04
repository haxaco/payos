# Category 3: Global Payroll & HR

**Last Updated:** January 2026  
**Profiles:** 3  
**Monthly Volume Range:** $3M - $80M  
**Primary Protocols:** Direct API

---

## Category Overview

Companies managing international workforce payments: salaries, contractor payments, benefits, expenses.

### Category Characteristics

| Attribute | Typical Range |
|-----------|---------------|
| **Transaction Size** | $100 - $20,000 |
| **Monthly Volume** | $5M - $100M |
| **Frequency** | Semi-monthly batches (15th, last day) |
| **Payment Pattern** | Scheduled, predictable |
| **Corridors** | US/EU → Global (LATAM focus) |
| **Key Need** | Multi-country batch, compliance, consistency |
| **Protocols** | Direct API |

### Why They Need PayOS
- LATAM payroll costs 3-4% vs 0.5% for US
- Each country has different rails and requirements
- Compliance documentation is complex
- Workers expect fast, consistent pay dates
- Building multi-country infrastructure is expensive

---

## Profile 3.1: Employer of Record (EOR)

**Profile Name:** `global_eor_platform`

### Description
Employs workers on behalf of companies without local entities. Handles compliance, payroll, benefits, taxes in 40+ countries.

### Business Model
- Per-employee fee ($300-700/month)
- FX margin on payroll (0.5-1.5%)
- Benefits administration
- Compliance services

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $20M - $80M |
| LATAM Portion | $6M - $25M (30%) |
| Avg Salary | $3,000 - $8,000 |
| Employees Managed | 5,000 - 20,000 |
| Pay Frequency | Semi-monthly (15th, last day) |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US → Brazil | 35% | USD → BRL |
| US → Mexico | 30% | USD → MXN |
| US → Argentina | 20% | USD → ARS |
| US → Colombia | 15% | USD → COP |

### Pain Points
1. LATAM payroll costs 3-4% vs 0.5% US
2. Argentina currency controls cause delays
3. Inconsistent pay dates across countries
4. Each country needs different rails (Pix, SPEI, ACH)
5. Compliance documentation is manual

### PayOS Integration
```
API Flow:
1. POST /v1/settlements/batch (payroll run)
2. POST /v1/entities/employees (onboarding)
3. GET /v1/compliance/requirements/{country} (country rules)
4. GET /v1/settlements/batch/{id}/status (tracking)
5. GET /v1/reports/payroll (compliance reports)
```

### Test Scenarios

| # | Scenario | Input | Expected Output |
|---|----------|-------|-----------------|
| 1 | Monthly payroll | 2,500 employees, 4 countries, $8M | All paid within 24h of initiation |
| 2 | Employee onboarding | New hire in Brazil | CPF verified, bank verified, ready for payroll |
| 3 | Argentina payment | 400 employees, $1.2M | Compliant routing, documentation provided |
| 4 | Failed payment | Invalid bank account | Clear error, employee notified, retry flow |

### Seed Data Requirements
- 1 partner account (EOR platform)
- 100 company client accounts
- 5,000 employee accounts (BR: 1750, MX: 1500, AR: 1000, CO: 750)
- 24 months payroll history
- Compliance documentation per country
- Tax and benefits metadata

### Sample Entities

**Partner Account:**
```json
{
  "name": "TalentBridge Inc",
  "type": "global_eor_platform",
  "tier": "enterprise",
  "monthly_volume_usd": 28000000,
  "primary_corridors": ["US-BR", "US-MX", "US-AR", "US-CO"],
  "integration_type": "api",
  "features": ["batch_payroll", "employee_onboarding", "compliance", "reporting"]
}
```

**Sample Employee:**
```json
{
  "employee_id": "emp_br_00001",
  "name": "Carlos Silva",
  "country": "BR",
  "employer_client": "client_tech_startup_01",
  "salary_usd": 5500,
  "payment_method": "pix",
  "pix_key": "12345678901",
  "pix_key_type": "cpf",
  "tax_id": "123.456.789-01",
  "start_date": "2024-03-15"
}
```

**Sample Payroll Batch:**
```json
{
  "batch_id": "payroll_2026_01_15",
  "pay_date": "2026-01-15",
  "company_clients": 45,
  "total_employees": 2487,
  "breakdown": {
    "BR": { "count": 870, "total_usd": 4785000 },
    "MX": { "count": 745, "total_usd": 3352500 },
    "AR": { "count": 497, "total_usd": 2236500 },
    "CO": { "count": 375, "total_usd": 1312500 }
  },
  "total_usd": 11686500
}
```

---

## Profile 3.2: Contractor Payment Platform

**Profile Name:** `global_contractor_payments`

### Description
Platform for paying international contractors. Handles invoicing, compliance (1099/W-8BEN), payments for companies with global freelance workforce.

### Business Model
- Platform fee (2-3%)
- FX margin (0.5-1%)
- Premium features (instant payout, cards)
- Compliance services

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $10M - $40M |
| Avg Payment | $800 - $3,000 |
| Contractors | 10,000 - 40,000 |
| Pay Frequency | Weekly, bi-weekly, monthly (varies) |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US → Brazil | 35% | USD → BRL |
| US → Mexico | 25% | USD → MXN |
| EU → LATAM | 20% | EUR → Various |
| US → Argentina | 10% | USD → ARS |
| Other | 10% | Various |

### Pain Points
1. Contractors hate waiting 5-7 days
2. Fees eat into contractor earnings
3. No stablecoin option for crypto-savvy contractors
4. Self-service is limited (bank changes are manual)
5. Each country has different timing

### PayOS Integration
```
API Flow:
1. POST /v1/settlements/batch (weekly/monthly batch)
2. POST /v1/settlements (on-demand instant payout)
3. POST /v1/entities/contractors (self-service onboarding)
4. GET /v1/wallets/{id}/balance (available for payout)
5. POST /v1/settlements/stablecoin (USDC option)
```

### Test Scenarios

| # | Scenario | Input | Expected Output |
|---|----------|-------|-----------------|
| 1 | Weekly batch | 3,500 contractors, $4M | All received within 48h |
| 2 | Instant payout | $2,400 on-demand request | Pix/SPEI in <15 min |
| 3 | Stablecoin option | Contractor prefers USDC | Direct USDC transfer, lower fees |
| 4 | Self-service update | Contractor changes bank account | Verified and updated within 24h |

### Seed Data Requirements
- 1 partner account
- 1,000 company client accounts
- 10,000 contractor accounts (multi-country)
- 100,000 historical payments
- Invoice and payment history
- Stablecoin preference flags

### Sample Entities

**Partner Account:**
```json
{
  "name": "FreelanceFlow Ltd",
  "type": "global_contractor_payments",
  "tier": "growth",
  "monthly_volume_usd": 18000000,
  "primary_corridors": ["US-BR", "US-MX", "EU-LATAM"],
  "integration_type": "api",
  "features": ["batch_payments", "instant_payout", "stablecoin", "self_service"]
}
```

**Sample Contractor:**
```json
{
  "contractor_id": "con_mx_00001",
  "name": "Sofia Rodriguez",
  "country": "MX",
  "clients": ["client_agency_01", "client_startup_02"],
  "avg_monthly_earnings_usd": 2800,
  "payment_preference": "instant",
  "payment_method": "spei",
  "clabe": "012180001234567890",
  "stablecoin_enabled": true,
  "usdc_address": "0x1234...abcd"
}
```

---

## Profile 3.3: Benefits & Expenses Platform

**Profile Name:** `global_benefits_expenses`

### Description
Platform for international employee benefits and expense reimbursements. Health stipends, equipment allowances, travel expenses, wellness benefits.

### Business Model
- Platform SaaS ($5-15/employee/month)
- Per-transaction fee (small)
- Card program revenue
- Benefits marketplace commissions

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $3M - $15M |
| Avg Transaction | $100 - $1,000 |
| Transactions/Month | 15,000 - 50,000 |
| Type | Stipends (scheduled), reimbursements (on-demand) |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US → LATAM | 60% | USD → BRL/MXN/COP |
| EU → LATAM | 30% | EUR → Various |
| Other | 10% | Various |

### Pain Points
1. Small amounts expensive to send internationally
2. Timing expectations (employees want fast reimbursement)
3. Multiple payment types (stipend vs reimbursement)
4. Card program integration complexity
5. Expense reconciliation across currencies

### PayOS Integration
```
API Flow:
1. POST /v1/settlements/batch (monthly stipends)
2. POST /v1/settlements (instant reimbursement)
3. POST /v1/cards/fund (virtual card funding)
4. GET /v1/reconciliation/expenses (expense reports)
```

### Test Scenarios

| # | Scenario | Input | Expected Output |
|---|----------|-------|-----------------|
| 1 | Monthly stipends | 2,000 employees, $200 each | All delivered by 5th of month |
| 2 | Instant reimbursement | $350 travel expense | Paid in <1 hour |
| 3 | Virtual card funding | $500 equipment allowance | Card funded instantly |
| 4 | Small amount batch | 500 x $50 wellness stipends | Cost-effective delivery |

### Seed Data Requirements
- 1 partner account
- 50 company client accounts
- 5,000 employee accounts
- 100,000 historical transactions
- Expense categories and policies
- Stipend schedules

### Sample Entities

**Partner Account:**
```json
{
  "name": "BenefitsGlobal",
  "type": "global_benefits_expenses",
  "tier": "growth",
  "monthly_volume_usd": 6000000,
  "primary_corridors": ["US-LATAM", "EU-LATAM"],
  "integration_type": "api",
  "features": ["batch_stipends", "instant_reimbursement", "cards", "reconciliation"]
}
```

**Sample Stipend Schedule:**
```json
{
  "company_id": "client_tech_co_01",
  "stipend_type": "health_wellness",
  "amount_usd": 200,
  "frequency": "monthly",
  "pay_day": 1,
  "eligible_employees": 450,
  "countries": ["BR", "MX", "CO"]
}
```

**Sample Expense:**
```json
{
  "expense_id": "exp_2026_00001",
  "employee_id": "emp_br_00123",
  "category": "travel",
  "amount_usd": 347.50,
  "currency_original": "BRL",
  "amount_original": 1750.00,
  "status": "approved",
  "reimbursement_type": "instant"
}
```

---

## Category Summary

| Profile | Name | Volume | Tx Size | Key Feature |
|---------|------|--------|---------|-------------|
| 3.1 | `global_eor_platform` | $20-80M | $3K-8K | Multi-country batch payroll |
| 3.2 | `global_contractor_payments` | $10-40M | $800-3K | Instant payout, stablecoin option |
| 3.3 | `global_benefits_expenses` | $3-15M | $100-1K | Small amounts, fast reimbursement |

---

## Integration Priority

For PayOS development, prioritize these features for Category 3:

1. **Batch Settlement API** — Critical for all profiles
2. **Multi-country Support** — Critical for 3.1
3. **Employee/Contractor Onboarding** — Important for 3.1, 3.2
4. **Instant Payout** — Critical for 3.2, 3.3
5. **Stablecoin Option** — Important for 3.2
6. **Compliance Reporting** — Critical for 3.1
7. **Small Amount Optimization** — Important for 3.3
8. **Virtual Card Funding** — Nice-to-have for 3.3

---

## Compliance Considerations

### Brazil
- CPF validation required
- Pix key verification
- Monthly BCB reporting (starting May 2026)
- SPSAV license considerations for scale

### Mexico
- RFC validation
- SPEI/CLABE verification
- ITF considerations for scale

### Argentina
- CUIT validation
- Currency control compliance
- Blue dollar considerations
- Multiple routing options (official vs CCL)

### Colombia
- NIT validation
- PSE/ACH integration
- Banking supervision compliance
