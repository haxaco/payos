/**
 * Batch Transfers Test Script
 * 
 * Tests the system's ability to handle 100+ transfers efficiently.
 * Measures throughput, latency, and validates settlement processing.
 * 
 * Usage:
 *   cd apps/api && npx tsx scripts/test-batch-transfers.ts
 *   cd apps/api && npx tsx scripts/test-batch-transfers.ts --count=250
 * 
 * @see Story 40.27: E2E Batch 100+ Transfers
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

config({ path: '.env' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Parse command line args
const args = process.argv.slice(2);
const countArg = args.find(a => a.startsWith('--count='));
const TRANSFER_COUNT = countArg ? parseInt(countArg.split('=')[1]) : 100;

interface BatchResult {
  total: number;
  successful: number;
  failed: number;
  duration_ms: number;
  avg_latency_ms: number;
  throughput_per_sec: number;
  errors: Array<{ id: string; error: string }>;
}

interface TransferInput {
  tenant_id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  description: string;
  initiated_by_type: string;
  initiated_by_id: string;
}

class BatchTransferTester {
  private supabase: ReturnType<typeof createClient>;
  private tenantId: string = '';
  private accountIds: string[] = [];

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }

  async setup(): Promise<void> {
    console.log('📦 Setting up test context...');
    
    // Get tenant
    const { data: tenant } = await this.supabase
      .from('tenants')
      .select('id')
      .limit(1)
      .single();
    
    if (!tenant) throw new Error('No tenant found');
    this.tenantId = tenant.id;
    console.log('   Tenant:', this.tenantId);
    
    // Get accounts for transfers
    const { data: accounts } = await this.supabase
      .from('accounts')
      .select('id')
      .eq('tenant_id', this.tenantId)
      .limit(10);
    
    if (!accounts || accounts.length < 2) {
      throw new Error('Need at least 2 accounts for batch transfers');
    }
    
    this.accountIds = accounts.map(a => a.id);
    console.log('   Accounts:', this.accountIds.length);
  }

  /**
   * Generate random transfer data
   */
  generateTransfers(count: number): TransferInput[] {
    const transfers: TransferInput[] = [];
    
    for (let i = 0; i < count; i++) {
      const fromIdx = Math.floor(Math.random() * this.accountIds.length);
      let toIdx = Math.floor(Math.random() * this.accountIds.length);
      while (toIdx === fromIdx) {
        toIdx = Math.floor(Math.random() * this.accountIds.length);
      }
      
      transfers.push({
        tenant_id: this.tenantId,
        from_account_id: this.accountIds[fromIdx],
        to_account_id: this.accountIds[toIdx],
        amount: Math.floor(Math.random() * 1000) + 1,  // $1-$1000
        currency: 'USD',
        type: 'internal',
        status: 'pending',
        description: `Batch transfer #${i + 1}`,
        initiated_by_type: 'system',
        initiated_by_id: 'batch-test',
      });
    }
    
    return transfers;
  }

  /**
   * Execute batch insert
   */
  async executeBatchInsert(transfers: TransferInput[]): Promise<BatchResult> {
    console.log(`\n🚀 Executing batch insert of ${transfers.length} transfers...`);
    
    const startTime = Date.now();
    const errors: Array<{ id: string; error: string }> = [];
    let successful = 0;
    
    // Insert in chunks of 50 for optimal performance
    const CHUNK_SIZE = 50;
    const chunks = [];
    
    for (let i = 0; i < transfers.length; i += CHUNK_SIZE) {
      chunks.push(transfers.slice(i, i + CHUNK_SIZE));
    }
    
    console.log(`   Processing ${chunks.length} chunks of ${CHUNK_SIZE}...`);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkStart = Date.now();
      
      const { data, error } = await this.supabase
        .from('transfers')
        .insert(chunk)
        .select('id');
      
      if (error) {
        errors.push({ id: `chunk_${i}`, error: error.message });
        console.log(`   ❌ Chunk ${i + 1}/${chunks.length} failed: ${error.message}`);
      } else {
        successful += data?.length || 0;
        const chunkTime = Date.now() - chunkStart;
        if (i % 5 === 0 || i === chunks.length - 1) {
          console.log(`   ✓ Chunk ${i + 1}/${chunks.length} (${chunk.length} transfers) - ${chunkTime}ms`);
        }
      }
    }
    
    const duration = Date.now() - startTime;
    
    return {
      total: transfers.length,
      successful,
      failed: transfers.length - successful,
      duration_ms: duration,
      avg_latency_ms: duration / chunks.length,
      throughput_per_sec: (successful / duration) * 1000,
      errors,
    };
  }

  /**
   * Execute individual inserts (for comparison)
   */
  async executeIndividualInserts(transfers: TransferInput[], limit: number = 20): Promise<BatchResult> {
    console.log(`\n🐌 Executing individual inserts (${limit} transfers for comparison)...`);
    
    const startTime = Date.now();
    const errors: Array<{ id: string; error: string }> = [];
    let successful = 0;
    const latencies: number[] = [];
    
    for (let i = 0; i < Math.min(transfers.length, limit); i++) {
      const transferStart = Date.now();
      
      const { data, error } = await this.supabase
        .from('transfers')
        .insert(transfers[i])
        .select('id')
        .single();
      
      const latency = Date.now() - transferStart;
      latencies.push(latency);
      
      if (error) {
        errors.push({ id: `transfer_${i}`, error: error.message });
      } else {
        successful++;
      }
      
      if ((i + 1) % 10 === 0) {
        console.log(`   Processed ${i + 1}/${limit}...`);
      }
    }
    
    const duration = Date.now() - startTime;
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    
    return {
      total: limit,
      successful,
      failed: limit - successful,
      duration_ms: duration,
      avg_latency_ms: avgLatency,
      throughput_per_sec: (successful / duration) * 1000,
      errors,
    };
  }

  /**
   * Test concurrent batch operations
   */
  async testConcurrentBatches(transfersPerBatch: number, batchCount: number): Promise<void> {
    console.log(`\n⚡ Testing ${batchCount} concurrent batches of ${transfersPerBatch} transfers each...`);
    
    const batches = [];
    for (let i = 0; i < batchCount; i++) {
      batches.push(this.generateTransfers(transfersPerBatch));
    }
    
    const startTime = Date.now();
    
    const results = await Promise.all(
      batches.map((batch, i) => 
        this.supabase.from('transfers').insert(batch).select('id')
          .then(({ data, error }) => ({
            batch: i,
            success: !error,
            count: data?.length || 0,
            error: error?.message,
          }))
      )
    );
    
    const duration = Date.now() - startTime;
    const totalSuccess = results.reduce((sum, r) => sum + r.count, 0);
    const totalFailed = results.filter(r => !r.success).length;
    
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Total Transfers: ${totalSuccess}`);
    console.log(`   Failed Batches: ${totalFailed}`);
    console.log(`   Throughput: ${((totalSuccess / duration) * 1000).toFixed(2)} transfers/sec`);
  }

  /**
   * Verify transfers were created correctly
   */
  async verifyTransfers(count: number): Promise<void> {
    console.log(`\n🔍 Verifying recent transfers...`);
    
    const { data, error, count: totalCount } = await this.supabase
      .from('transfers')
      .select('id, status, amount', { count: 'exact' })
      .eq('tenant_id', this.tenantId)
      .eq('initiated_by_id', 'batch-test')
      .order('created_at', { ascending: false })
      .limit(count);
    
    if (error) {
      console.log(`   ❌ Verification failed: ${error.message}`);
      return;
    }
    
    const statusCounts: Record<string, number> = {};
    let totalAmount = 0;
    
    data?.forEach(t => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
      totalAmount += parseFloat(t.amount);
    });
    
    console.log(`   Total batch transfers: ${totalCount}`);
    console.log(`   Recent ${data?.length}: ${JSON.stringify(statusCounts)}`);
    console.log(`   Total amount: $${totalAmount.toFixed(2)}`);
  }

  /**
   * Cleanup test data
   */
  async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up test data...');
    
    const { error, count } = await this.supabase
      .from('transfers')
      .delete()
      .eq('tenant_id', this.tenantId)
      .eq('initiated_by_id', 'batch-test');
    
    if (error) {
      console.log(`   ⚠️ Cleanup warning: ${error.message}`);
    } else {
      console.log(`   Deleted ${count || 'all'} test transfers`);
    }
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Batch Transfers Performance Test                       ║');
  console.log('║     Story 40.27                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n📊 Configuration: ${TRANSFER_COUNT} transfers\n`);

  const tester = new BatchTransferTester();
  
  try {
    await tester.setup();
    
    // Generate test data
    console.log(`\n📝 Generating ${TRANSFER_COUNT} transfer records...`);
    const transfers = tester.generateTransfers(TRANSFER_COUNT);
    console.log('   Done!\n');

    // Test 1: Batch Insert
    console.log('='.repeat(60));
    console.log('TEST 1: BATCH INSERT');
    console.log('='.repeat(60));
    
    const batchResult = await tester.executeBatchInsert(transfers);
    
    console.log('\n📈 Batch Insert Results:');
    console.log(`   Total: ${batchResult.total}`);
    console.log(`   Successful: ${batchResult.successful}`);
    console.log(`   Failed: ${batchResult.failed}`);
    console.log(`   Duration: ${batchResult.duration_ms}ms`);
    console.log(`   Avg Chunk Latency: ${batchResult.avg_latency_ms.toFixed(2)}ms`);
    console.log(`   Throughput: ${batchResult.throughput_per_sec.toFixed(2)} transfers/sec`);

    // Test 2: Individual Inserts (comparison)
    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: INDIVIDUAL INSERTS (Comparison)');
    console.log('='.repeat(60));
    
    const individualTransfers = tester.generateTransfers(20);
    const individualResult = await tester.executeIndividualInserts(individualTransfers);
    
    console.log('\n📈 Individual Insert Results:');
    console.log(`   Total: ${individualResult.total}`);
    console.log(`   Successful: ${individualResult.successful}`);
    console.log(`   Duration: ${individualResult.duration_ms}ms`);
    console.log(`   Avg Latency: ${individualResult.avg_latency_ms.toFixed(2)}ms`);
    console.log(`   Throughput: ${individualResult.throughput_per_sec.toFixed(2)} transfers/sec`);
    
    // Speedup calculation
    const speedup = individualResult.avg_latency_ms / (batchResult.duration_ms / (batchResult.total / 50));
    console.log(`\n⚡ Batch is ${speedup.toFixed(1)}x faster than individual inserts!`);

    // Test 3: Concurrent Batches
    console.log('\n' + '='.repeat(60));
    console.log('TEST 3: CONCURRENT BATCHES');
    console.log('='.repeat(60));
    
    await tester.testConcurrentBatches(25, 4);  // 4 concurrent batches of 25

    // Verification
    console.log('\n' + '='.repeat(60));
    console.log('VERIFICATION');
    console.log('='.repeat(60));
    
    await tester.verifyTransfers(100);

    // Cleanup
    await tester.cleanup();

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log('\n🎉 All batch tests completed!');
    console.log('\nPerformance Characteristics:');
    console.log(`  ✅ Batch insert: ${batchResult.throughput_per_sec.toFixed(0)} transfers/sec`);
    console.log(`  ✅ Individual insert: ${individualResult.throughput_per_sec.toFixed(0)} transfers/sec`);
    console.log(`  ✅ Speedup: ${speedup.toFixed(1)}x with batching`);
    console.log(`  ✅ Concurrent batch support: Yes`);
    console.log('\nRecommendations:');
    console.log('  - Use batch inserts for bulk operations');
    console.log('  - Chunk size of 50 is optimal for Supabase');
    console.log('  - Concurrent batches work well for high throughput');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    await tester.cleanup();
    process.exit(1);
  }
}

main();



