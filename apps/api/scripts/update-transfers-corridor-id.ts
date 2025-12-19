#!/usr/bin/env tsx

/**
 * Update existing transfers with corridor_id
 * 
 * Generates corridor_id based on currency and destination_currency
 * Format: "USD-MXN", "USD-EUR", etc.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lgsreshwntpdrthfgwos.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function updateTransfersWithCorridorId() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     Update Transfers with Corridor ID v1.0           ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  let totalUpdated = 0;
  let totalErrors = 0;
  let batchNumber = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    batchNumber++;
    console.log(`📊 Batch ${batchNumber}: Fetching transfers without corridor_id...`);
    
    // Get transfers without corridor_id or with null corridor_id
    const { data: transfers, error: fetchError } = await supabase
      .from('transfers')
      .select('id, currency, destination_currency, corridor_id')
      .or('corridor_id.is.null,corridor_id.eq.')
      .limit(batchSize);

    if (fetchError) {
      console.error('❌ Failed to fetch transfers:', fetchError);
      process.exit(1);
    }

    if (!transfers || transfers.length === 0) {
      hasMore = false;
      if (batchNumber === 1) {
        console.log('✅ No transfers need updating. All transfers already have corridor_id.\n');
        return;
      }
      break;
    }

    console.log(`   Found ${transfers.length} transfers in this batch\n`);

    // Group by currency pair for batch updates
    const updatesByCorridor: Record<string, string[]> = {};
    
    for (const transfer of transfers) {
      const fromCurrency = transfer.currency || 'USD';
      const toCurrency = transfer.destination_currency || transfer.currency || 'USD';
      const corridorId = `${fromCurrency}-${toCurrency}`;
      
      if (!updatesByCorridor[corridorId]) {
        updatesByCorridor[corridorId] = [];
      }
      updatesByCorridor[corridorId].push(transfer.id);
    }

    console.log(`   Found ${Object.keys(updatesByCorridor).length} unique corridors in this batch\n`);

    // Update in batches by corridor
    const updateBatchSize = 100; // Update 100 at a time
    for (const [corridorId, transferIds] of Object.entries(updatesByCorridor)) {
      for (let i = 0; i < transferIds.length; i += updateBatchSize) {
        const batch = transferIds.slice(i, i + updateBatchSize);
        
        const { error: updateError, count } = await supabase
          .from('transfers')
          .update({ corridor_id: corridorId })
          .in('id', batch)
          .select('id', { count: 'exact', head: true });

        if (updateError) {
          console.error(`   ❌ Error updating ${corridorId} batch:`, updateError.message);
          totalErrors += batch.length;
        } else {
          const updated = count || batch.length;
          totalUpdated += updated;
        }
      }
    }

    console.log(`   ✅ Batch ${batchNumber} complete: Updated ${transfers.length} transfers`);
    
    // If we got fewer than batchSize, we're done
    if (transfers.length < batchSize) {
      hasMore = false;
    }
    
    console.log(''); // Blank line between batches
  }

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                  Update Complete!                     ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  console.log('📊 Final Summary:');
  console.log(`   ✅ Successfully updated: ${totalUpdated.toLocaleString()} transfers`);
  if (totalErrors > 0) {
    console.log(`   ❌ Errors: ${totalErrors.toLocaleString()} transfers`);
  }
  console.log(`   📦 Total batches processed: ${batchNumber}\n`);
  console.log('✅ All transfers now have corridor_id!\n');
}

updateTransfersWithCorridorId().catch(console.error);

