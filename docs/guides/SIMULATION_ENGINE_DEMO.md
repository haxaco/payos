# 🎬 Simulation Engine Demo & Walkthrough

**Epic 28 Complete - Interactive Guide**

This guide provides a hands-on walkthrough of the PayOS Simulation Engine, demonstrating all features and use cases.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Single Transfer Simulation](#single-transfer-simulation)
3. [Batch Simulation](#batch-simulation)
4. [Simulation Execution](#simulation-execution)
5. [Refund Simulation](#refund-simulation)
6. [Stream Simulation](#stream-simulation)
7. [UI Integration](#ui-integration)
8. [Advanced Use Cases](#advanced-use-cases)

---

## 🚀 Quick Start

### Prerequisites

```bash
# Ensure API server is running
cd apps/api
npm run dev

# In another terminal, ensure web app is running
cd apps/web
npm run dev
```

### Environment Setup

```bash
# Load test credentials
source test-credentials.sh

# Verify API key
echo $API_KEY
# Should output: pk_test_demo_fintech_key_12345
```

---

## 1️⃣ Single Transfer Simulation

### Basic Transfer (Same Currency)

```bash
curl -X POST "$API_URL/v1/simulate" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "transfer",
    "payload": {
      "from_account_id": "'"$TEST_ACCOUNT_MARIA"'",
      "to_account_id": "'"$TEST_ACCOUNT_ANA"'",
      "amount": "100.00",
      "currency": "USDC"
    }
  }' | jq '.'
```

**Expected Output:**
```json
{
  "success": true,
  "data": {
    "simulation_id": "sim_abc123",
    "status": "completed",
    "can_execute": true,
    "preview": {
      "source": {
        "account_id": "acc_maria",
        "amount": "100.00",
        "currency": "USDC",
        "balance_before": "50000.00",
        "balance_after": "49899.50"
      },
      "destination": {
        "account_id": "acc_ana",
        "amount": "100.00",
        "currency": "USDC"
      },
      "fees": {
        "platform_fee": "0.50",
        "fx_fee": "0.00",
        "rail_fee": "0.00",
        "total": "0.50",
        "currency": "USDC"
      },
      "timing": {
        "estimated_duration_seconds": 5,
        "rail": "internal"
      }
    },
    "warnings": [],
    "errors": []
  }
}
```

### Cross-Currency Transfer (with FX)

```bash
curl -X POST "$API_URL/v1/simulate" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "transfer",
    "payload": {
      "from_account_id": "'"$TEST_ACCOUNT_MARIA"'",
      "to_account_id": "'"$TEST_ACCOUNT_ANA"'",
      "amount": "1000.00",
      "currency": "USD",
      "destination_currency": "BRL"
    }
  }' | jq '.data.preview.fx, .data.preview.fees'
```

**Expected Output:**
```json
// FX Information
{
  "rate": "5.85",
  "spread": "0.50",
  "rate_locked": false
}

// Fees
{
  "platform_fee": "5.00",
  "fx_fee": "2.00",
  "rail_fee": "1.50",
  "total": "8.50",
  "currency": "USD"
}
```

### Large Transfer (with Warning)

```bash
curl -X POST "$API_URL/v1/simulate" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "transfer",
    "payload": {
      "from_account_id": "'"$TEST_ACCOUNT_MARIA"'",
      "to_account_id": "'"$TEST_ACCOUNT_ANA"'",
      "amount": "45000.00",
      "currency": "USDC"
    }
  }' | jq '.data.warnings'
```

**Expected Output:**
```json
[
  {
    "code": "LOW_BALANCE_AFTER",
    "message": "Balance will be low after this transfer",
    "details": {
      "balance_after": "4775.00",
      "threshold": "5000.00"
    }
  },
  {
    "code": "LARGE_TRANSFER",
    "message": "Transfer amount exceeds 10% of current balance",
    "details": {
      "amount": "45000.00",
      "balance": "50000.00",
      "percentage": "90.00"
    }
  }
]
```

---

## 2️⃣ Batch Simulation

### Small Batch (10 Transfers)

```bash
curl -X POST "$API_URL/v1/simulate/batch" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "simulations": [
      {
        "action": "transfer",
        "payload": {
          "from_account_id": "'"$TEST_ACCOUNT_MARIA"'",
          "to_account_id": "'"$TEST_ACCOUNT_ANA"'",
          "amount": "100.00",
          "currency": "USDC"
        }
      },
      {
        "action": "transfer",
        "payload": {
          "from_account_id": "'"$TEST_ACCOUNT_MARIA"'",
          "to_account_id": "'"$TEST_ACCOUNT_LUIS"'",
          "amount": "200.00",
          "currency": "USDC"
        }
      }
    ]
  }' | jq '.data.summary'
```

**Expected Output:**
```json
{
  "can_execute_all": true,
  "total_count": 2,
  "successful": 2,
  "failed": 0,
  "totals": {
    "amount": {
      "USDC": "300.00"
    },
    "fees": {
      "USDC": "1.50"
    }
  },
  "by_currency": {
    "USDC": {
      "count": 2,
      "total_amount": "300.00",
      "total_fees": "1.50"
    }
  },
  "by_rail": {
    "internal": {
      "count": 2,
      "total_amount": "300.00"
    }
  }
}
```

### Performance Test (1000 Transfers)

```bash
# Run the performance test script
./test-batch-simulation.sh

# Should complete in < 1 second!
```

**Expected Performance:**
```
Batch of 1000 simulations
Duration: ~659ms
Rate: ~1517 simulations/second
```

---

## 3️⃣ Simulation Execution

### Execute a Simulation

```bash
# Step 1: Create simulation
SIMULATION_ID=$(curl -s -X POST "$API_URL/v1/simulate" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "transfer",
    "payload": {
      "from_account_id": "'"$TEST_ACCOUNT_MARIA"'",
      "to_account_id": "'"$TEST_ACCOUNT_ANA"'",
      "amount": "50.00",
      "currency": "USDC"
    }
  }' | jq -r '.data.simulation_id')

echo "Created simulation: $SIMULATION_ID"

# Step 2: Execute the simulation
curl -X POST "$API_URL/v1/simulate/$SIMULATION_ID/execute" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" | jq '.'
```

**Expected Output:**
```json
{
  "success": true,
  "data": {
    "simulation_id": "sim_abc123",
    "status": "executed",
    "execution_result": {
      "type": "transfer",
      "id": "txn_xyz789",
      "status": "pending"
    },
    "variance": {
      "fx_rate": {
        "simulated": "1.00",
        "actual": "1.00",
        "difference": "0.00",
        "percentage": "0.00"
      },
      "fees": {
        "simulated": "0.25",
        "actual": "0.25",
        "difference": "0.00",
        "percentage": "0.00"
      },
      "variance_level": "none"
    },
    "resource_url": "/v1/transfers/txn_xyz789"
  }
}
```

### Idempotency Test

```bash
# Execute the same simulation again
curl -X POST "$API_URL/v1/simulate/$SIMULATION_ID/execute" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" | jq '.data.execution_result.id'

# Should return the SAME transfer ID (no duplicate)
```

---

## 4️⃣ Refund Simulation

### Valid Partial Refund

```bash
# First, create a transfer to refund
TRANSFER_ID=$(curl -s -X POST "$API_URL/v1/transfers" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from_account_id": "'"$TEST_ACCOUNT_MARIA"'",
    "to_account_id": "'"$TEST_ACCOUNT_ANA"'",
    "amount": "100.00",
    "currency": "USDC"
  }' | jq -r '.data.id')

# Now simulate a partial refund
curl -X POST "$API_URL/v1/simulate" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "refund",
    "payload": {
      "transfer_id": "'"$TRANSFER_ID"'",
      "amount": "25.00",
      "reason": "customer_request"
    }
  }' | jq '.data.preview'
```

**Expected Output:**
```json
{
  "refund": {
    "transfer_id": "txn_abc123",
    "amount": "25.00",
    "currency": "USDC",
    "reason": "customer_request"
  },
  "eligibility": {
    "is_eligible": true,
    "window_expires": "2026-02-03T12:00:00Z",
    "days_remaining": 29
  },
  "original_transfer": {
    "amount": "100.00",
    "already_refunded": "0.00",
    "available_to_refund": "100.00"
  },
  "balance_impact": {
    "source_balance_after": "49924.75",
    "destination_balance_after": "24975.00"
  }
}
```

### Invalid Refund (Over Amount)

```bash
curl -X POST "$API_URL/v1/simulate" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "refund",
    "payload": {
      "transfer_id": "'"$TRANSFER_ID"'",
      "amount": "150.00",
      "reason": "customer_request"
    }
  }' | jq '.data.errors'
```

**Expected Output:**
```json
[
  {
    "code": "REFUND_AMOUNT_EXCEEDS_AVAILABLE",
    "message": "Refund amount exceeds available amount",
    "details": {
      "requested": "150.00",
      "available": "100.00"
    }
  }
]
```

---

## 5️⃣ Stream Simulation

### Finite Stream (30 Days)

```bash
curl -X POST "$API_URL/v1/simulate" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "stream",
    "payload": {
      "from_account_id": "'"$TEST_ACCOUNT_MARIA"'",
      "to_account_id": "'"$TEST_ACCOUNT_ANA"'",
      "rate_per_second": "0.01",
      "currency": "USDC",
      "duration_seconds": 2592000
    }
  }' | jq '.data.preview'
```

**Expected Output:**
```json
{
  "stream": {
    "rate_per_second": "0.01",
    "duration_seconds": 2592000,
    "total_cost": "25920.00",
    "cost_per_day": "864.00",
    "cost_per_7_days": "6048.00",
    "cost_per_30_days": "25920.00"
  },
  "runway": {
    "estimated_runway_days": 57,
    "depletion_date": "2026-03-02T12:00:00Z",
    "will_complete": true
  },
  "balance_impact": {
    "balance_before": "50000.00",
    "balance_after": "24080.00"
  }
}
```

### Infinite Stream (with Warnings)

```bash
curl -X POST "$API_URL/v1/simulate" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "stream",
    "payload": {
      "from_account_id": "'"$TEST_ACCOUNT_MARIA"'",
      "to_account_id": "'"$TEST_ACCOUNT_ANA"'",
      "rate_per_second": "0.1",
      "currency": "USDC"
    }
  }' | jq '.data.warnings'
```

**Expected Output:**
```json
[
  {
    "code": "LOW_RUNWAY",
    "message": "Account will run out of funds in less than 30 days",
    "details": {
      "estimated_runway_days": 5,
      "depletion_date": "2026-01-09T12:00:00Z"
    }
  },
  {
    "code": "HIGH_DAILY_COST",
    "message": "Stream cost exceeds 10% of current balance per day",
    "details": {
      "daily_cost": "8640.00",
      "balance": "50000.00",
      "percentage": "17.28"
    }
  }
]
```

---

## 6️⃣ UI Integration

### Using the SimulationPreviewModal

```tsx
import { SimulationPreviewModal } from '@/components/simulation-preview-modal';
import { useSimulation } from '@/hooks/use-simulation';

function MyTransferForm() {
  const { simulate, execute, simulation, isSimulating, isExecuting } = useSimulation();
  const [showPreview, setShowPreview] = useState(false);

  const handlePreview = async () => {
    const result = await simulate({
      action: 'transfer',
      payload: {
        from_account_id: formData.from,
        to_account_id: formData.to,
        amount: formData.amount,
        currency: formData.currency,
      },
    });

    if (result) {
      setShowPreview(true);
    }
  };

  const handleExecute = async () => {
    if (!simulation) return;
    
    const result = await execute(simulation.simulation_id);
    if (result) {
      // Success! Show success message, close modal, etc.
      setShowPreview(false);
    }
  };

  return (
    <>
      <Button onClick={handlePreview} disabled={isSimulating}>
        Preview Transfer
      </Button>

      <SimulationPreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        simulation={simulation}
        onExecute={handleExecute}
        isExecuting={isExecuting}
      />
    </>
  );
}
```

---

## 7️⃣ Advanced Use Cases

### AI Agent: Route Optimization

```typescript
/**
 * AI Agent finds the cheapest route for a payment
 */
async function findBestRoute(amount: string, targetCurrency: string) {
  const routes = [
    { currency: 'USDC', destination_currency: targetCurrency },
    { currency: 'USD', destination_currency: targetCurrency },
    { currency: targetCurrency }, // Direct
  ];

  const batch = await simulateBatch({
    simulations: routes.map(route => ({
      action: 'transfer',
      payload: {
        from_account_id: 'acc_source',
        to_account_id: 'acc_dest',
        amount,
        ...route,
      },
    })),
  });

  const best = batch.simulations
    .filter(s => s.can_execute)
    .sort((a, b) => 
      parseFloat(a.preview.fees.total) - parseFloat(b.preview.fees.total)
    )[0];

  console.log(`Best route: ${best.preview.timing.rail}`);
  console.log(`Total fees: ${best.preview.fees.total}`);
  console.log(`Arrival: ${best.preview.timing.estimated_duration_seconds}s`);

  return best;
}
```

### Payroll Validation

```typescript
/**
 * Validate entire payroll before processing
 */
async function validatePayroll(employees: Employee[]) {
  const batch = await simulateBatch({
    simulations: employees.map(emp => ({
      action: 'transfer',
      payload: {
        from_account_id: companyAccountId,
        to_account_id: emp.accountId,
        amount: emp.salary.toString(),
        currency: 'USDC',
        description: `Salary for ${emp.name}`,
      },
    })),
  });

  console.log(`\n📊 Payroll Validation Report`);
  console.log(`Total employees: ${batch.total_count}`);
  console.log(`✅ Can process: ${batch.successful}`);
  console.log(`❌ Will fail: ${batch.failed}`);
  console.log(`\nTotals:`);
  console.log(`  Amount: ${batch.summary.totals.amount.USDC} USDC`);
  console.log(`  Fees: ${batch.summary.totals.fees.USDC} USDC`);

  if (!batch.can_execute_all) {
    console.log(`\n⚠️ Failed payments:`);
    batch.simulations
      .filter(s => !s.can_execute)
      .forEach(s => {
        console.log(`  ${s.errors[0].message}`);
      });
  }

  return batch;
}
```

### Streaming Budget Planning

```typescript
/**
 * Determine how long a stream can run
 */
async function planStreamBudget(
  ratePerSecond: string,
  desiredDays: number
) {
  const simulation = await simulate({
    action: 'stream',
    payload: {
      from_account_id: 'acc_123',
      to_account_id: 'acc_456',
      rate_per_second: ratePerSecond,
      currency: 'USDC',
      duration_seconds: desiredDays * 86400,
    },
  });

  const { stream, runway, balance_impact } = simulation.preview;

  console.log(`\n💰 Stream Budget Analysis`);
  console.log(`Rate: ${stream.rate_per_second} USDC/second`);
  console.log(`Desired duration: ${desiredDays} days`);
  console.log(`Total cost: ${stream.total_cost} USDC`);
  console.log(`\nCurrent balance: ${balance_impact.balance_before} USDC`);
  console.log(`Runway: ${runway.estimated_runway_days} days`);
  console.log(`Will complete: ${runway.will_complete ? '✅' : '❌'}`);

  if (!runway.will_complete) {
    console.log(`\n⚠️ Insufficient funds!`);
    console.log(`Need additional: ${parseFloat(stream.total_cost) - parseFloat(balance_impact.balance_before)} USDC`);
  }

  return simulation;
}
```

---

## 🎯 Testing Checklist

Use this checklist to verify all features:

### Basic Features
- [ ] Same-currency transfer simulation
- [ ] Cross-currency transfer simulation
- [ ] Insufficient balance error
- [ ] Low balance warning
- [ ] Large transfer warning
- [ ] Account not found error

### Batch Features
- [ ] Small batch (10 transfers)
- [ ] Large batch (1000 transfers)
- [ ] Cumulative balance tracking
- [ ] Mixed success/failure
- [ ] Summary statistics

### Execution Features
- [ ] Execute valid simulation
- [ ] Idempotency (execute twice)
- [ ] Expired simulation error
- [ ] Variance tracking
- [ ] Resource URL provided

### Refund Features
- [ ] Valid partial refund
- [ ] Valid full refund
- [ ] Over-amount error
- [ ] Window expiry error
- [ ] Balance impact preview

### Stream Features
- [ ] Finite stream simulation
- [ ] Infinite stream simulation
- [ ] Low runway warning
- [ ] High daily cost warning
- [ ] Insufficient balance error

### UI Features
- [ ] Preview modal displays correctly
- [ ] Loading states work
- [ ] Error handling works
- [ ] Execute button works
- [ ] Cancel closes modal

---

## 🐛 Troubleshooting

### Issue: "Authentication required"
**Solution:** Ensure API key is set correctly:
```bash
source test-credentials.sh
echo $API_KEY
```

### Issue: "Account not found"
**Solution:** Use test account IDs from environment:
```bash
echo $TEST_ACCOUNT_MARIA
echo $TEST_ACCOUNT_ANA
echo $TEST_ACCOUNT_LUIS
```

### Issue: "Simulation expired"
**Solution:** Simulations expire after 1 hour. Create a new one.

### Issue: Batch simulation slow
**Solution:** Check that account fetching is batched (should be ~1ms per simulation)

---

## 📚 Next Steps

1. **Explore the Code**: Check `apps/api/src/routes/simulations.ts`
2. **Run Tests**: `cd apps/api && npm test -- simulations`
3. **Try the UI**: Open `http://localhost:3000/dashboard/transfers`
4. **Build an Agent**: Use the examples above to build AI-powered features

---

**Happy Simulating! 🚀**



