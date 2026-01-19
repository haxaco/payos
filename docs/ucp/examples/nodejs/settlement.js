/**
 * PayOS UCP Settlement Example (Node.js)
 *
 * This example demonstrates how to:
 * 1. Get an FX quote
 * 2. Acquire a settlement token
 * 3. Execute the settlement
 * 4. Check settlement status
 */

const PAYOS_API_KEY = process.env.PAYOS_API_KEY || 'pk_test_...';
const PAYOS_BASE_URL = process.env.PAYOS_BASE_URL || 'https://api.payos.com';

/**
 * Get an FX quote for a settlement corridor
 */
async function getQuote(corridor, amount, currency) {
  const response = await fetch(`${PAYOS_BASE_URL}/v1/ucp/quote`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAYOS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ corridor, amount, currency }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Quote failed: ${JSON.stringify(error)}`);
  }

  return response.json();
}

/**
 * Acquire a settlement token
 */
async function acquireToken(corridor, amount, currency, recipient, metadata = {}) {
  const response = await fetch(`${PAYOS_BASE_URL}/v1/ucp/tokens`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAYOS_API_KEY}`,
      'Content-Type': 'application/json',
      'UCP-Agent': 'ExampleApp/2026-01-11',
    },
    body: JSON.stringify({
      corridor,
      amount,
      currency,
      recipient,
      metadata,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token acquisition failed: ${JSON.stringify(error)}`);
  }

  return response.json();
}

/**
 * Execute settlement with token
 */
async function settle(token, idempotencyKey) {
  const response = await fetch(`${PAYOS_BASE_URL}/v1/ucp/settle`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAYOS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token,
      idempotency_key: idempotencyKey,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Settlement failed: ${JSON.stringify(error)}`);
  }

  return response.json();
}

/**
 * Get settlement status
 */
async function getSettlementStatus(settlementId) {
  const response = await fetch(`${PAYOS_BASE_URL}/v1/ucp/settlements/${settlementId}`, {
    headers: {
      'Authorization': `Bearer ${PAYOS_API_KEY}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Status check failed: ${JSON.stringify(error)}`);
  }

  return response.json();
}

/**
 * Wait for settlement to complete
 */
async function waitForCompletion(settlementId, maxWaitMs = 120000) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const status = await getSettlementStatus(settlementId);

    if (status.status === 'completed') {
      return status;
    }

    if (status.status === 'failed') {
      throw new Error(`Settlement failed: ${status.failure_reason}`);
    }

    // Wait 2 seconds before polling again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error('Settlement timed out');
}

// =============================================================================
// Example Usage
// =============================================================================

async function main() {
  console.log('PayOS UCP Settlement Example\n');

  // Step 1: Get a quote
  console.log('1. Getting FX quote...');
  const quote = await getQuote('pix', 100, 'USD');
  console.log(`   Quote: $${quote.from_amount} USD = R$${quote.to_amount} BRL`);
  console.log(`   Rate: ${quote.fx_rate}, Fees: $${quote.fees}`);
  console.log(`   Expires: ${quote.expires_at}\n`);

  // Step 2: Acquire a settlement token
  console.log('2. Acquiring settlement token...');
  const tokenResponse = await acquireToken(
    'pix',
    100,
    'USD',
    {
      type: 'pix',
      pix_key: 'maria@email.com',
      pix_key_type: 'email',
      name: 'Maria Silva',
    },
    {
      order_id: 'order_12345',
      customer_email: 'customer@example.com',
    }
  );
  console.log(`   Token: ${tokenResponse.token.substring(0, 20)}...`);
  console.log(`   Settlement ID: ${tokenResponse.settlement_id}`);
  console.log(`   Locked rate: ${tokenResponse.quote.fx_rate}`);
  console.log(`   Expires: ${tokenResponse.expires_at}\n`);

  // Step 3: Execute settlement
  console.log('3. Executing settlement...');
  const settlement = await settle(
    tokenResponse.token,
    `order_12345_${Date.now()}`
  );
  console.log(`   Status: ${settlement.status}`);
  console.log(`   Estimated completion: ${settlement.estimated_completion}\n`);

  // Step 4: Wait for completion
  console.log('4. Waiting for settlement to complete...');
  const completed = await waitForCompletion(settlement.id);
  console.log(`   Final status: ${completed.status}`);
  console.log(`   Transfer ID: ${completed.transfer_id}`);
  console.log(`   Completed at: ${completed.completed_at}\n`);

  console.log('✅ Settlement complete!');
  console.log(`   Amount sent: R$${tokenResponse.quote.to_amount} BRL`);
  console.log(`   Recipient: Maria Silva (maria@email.com)`);
}

main().catch(console.error);
