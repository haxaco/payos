#!/usr/bin/env tsx

/**
 * Simulation Cleanup Worker
 * Story 28.7: Automatic cleanup of old simulations
 * 
 * This script:
 * - Deletes simulations older than 7 days
 * - Preserves executed simulations that might be referenced
 * - Logs cleanup statistics
 * 
 * Run manually: npm run cleanup:simulations
 * Run in cron: 0 2 * * * (daily at 2 AM)
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

interface CleanupStats {
  totalSimulations: number;
  deletedCount: number;
  preservedCount: number;
  errorCount: number;
  oldestDeleted?: string;
  newestDeleted?: string;
  byStatus: Record<string, number>;
  byAction: Record<string, number>;
}

async function cleanupSimulations(): Promise<CleanupStats> {
  const stats: CleanupStats = {
    totalSimulations: 0,
    deletedCount: 0,
    preservedCount: 0,
    errorCount: 0,
    byStatus: {},
    byAction: {},
  };

  console.log('🧹 Starting simulation cleanup...\n');

  // Calculate cutoff date (7 days ago)
  const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  console.log(`   Cutoff date: ${cutoffDate.toISOString()}`);
  console.log(`   Deleting simulations older than 7 days\n`);

  try {
    // First, get count of all old simulations
    const { count: totalCount, error: countError } = await supabase
      .from('simulations')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', cutoffDate.toISOString());

    if (countError) {
      console.error('❌ Error counting simulations:', countError.message);
      stats.errorCount++;
      return stats;
    }

    stats.totalSimulations = totalCount || 0;
    console.log(`   Found ${stats.totalSimulations} simulations older than 7 days\n`);

    if (stats.totalSimulations === 0) {
      console.log('✅ No simulations to clean up');
      return stats;
    }

    // Fetch simulations to analyze before deletion
    const { data: oldSimulations, error: fetchError } = await supabase
      .from('simulations')
      .select('id, status, action_type, executed, created_at, execution_result_id')
      .lt('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('❌ Error fetching simulations:', fetchError.message);
      stats.errorCount++;
      return stats;
    }

    if (!oldSimulations || oldSimulations.length === 0) {
      console.log('✅ No simulations to clean up');
      return stats;
    }

    // Analyze simulations
    const toDelete: string[] = [];
    const toPreserve: string[] = [];

    for (const sim of oldSimulations) {
      // Track statistics
      stats.byStatus[sim.status] = (stats.byStatus[sim.status] || 0) + 1;
      stats.byAction[sim.action_type] = (stats.byAction[sim.action_type] || 0) + 1;

      // Preserve executed simulations that have execution results
      // These might be referenced by the actual transfers/refunds/streams
      if (sim.executed && sim.execution_result_id) {
        toPreserve.push(sim.id);
        stats.preservedCount++;
      } else {
        toDelete.push(sim.id);
      }
    }

    console.log('📊 Analysis:');
    console.log(`   Total found: ${oldSimulations.length}`);
    console.log(`   To delete: ${toDelete.length}`);
    console.log(`   To preserve (executed): ${toPreserve.length}\n`);

    console.log('   By Status:');
    Object.entries(stats.byStatus).forEach(([status, count]) => {
      console.log(`     ${status}: ${count}`);
    });
    console.log('');

    console.log('   By Action:');
    Object.entries(stats.byAction).forEach(([action, count]) => {
      console.log(`     ${action}: ${count}`);
    });
    console.log('');

    // Delete simulations in batches of 100
    if (toDelete.length > 0) {
      console.log('🗑️  Deleting simulations...');
      
      const batchSize = 100;
      for (let i = 0; i < toDelete.length; i += batchSize) {
        const batch = toDelete.slice(i, i + batchSize);
        
        const { error: deleteError } = await supabase
          .from('simulations')
          .delete()
          .in('id', batch);

        if (deleteError) {
          console.error(`   ❌ Error deleting batch ${i / batchSize + 1}:`, deleteError.message);
          stats.errorCount += batch.length;
        } else {
          stats.deletedCount += batch.length;
          console.log(`   ✓ Deleted batch ${i / batchSize + 1} (${batch.length} simulations)`);
        }
      }
      console.log('');
    }

    // Track date range
    if (oldSimulations.length > 0) {
      stats.oldestDeleted = oldSimulations[0].created_at;
      stats.newestDeleted = oldSimulations[oldSimulations.length - 1].created_at;
    }

  } catch (error) {
    console.error('❌ Unexpected error during cleanup:', error);
    stats.errorCount++;
  }

  return stats;
}

async function markExpiredSimulations(): Promise<number> {
  console.log('⏰ Marking expired simulations...\n');

  const now = new Date();
  
  try {
    // Update simulations that have passed their expiry time but aren't marked as expired
    const { data, error } = await supabase
      .from('simulations')
      .update({ 
        status: 'expired',
        updated_at: now.toISOString(),
      })
      .lt('expires_at', now.toISOString())
      .neq('status', 'expired')
      .neq('status', 'executed')
      .select('id');

    if (error) {
      console.error('   ❌ Error marking expired simulations:', error.message);
      return 0;
    }

    const count = data?.length || 0;
    console.log(`   ✓ Marked ${count} simulations as expired\n`);
    return count;

  } catch (error) {
    console.error('   ❌ Unexpected error:', error);
    return 0;
  }
}

async function getSimulationStats() {
  console.log('📈 Current simulation statistics:\n');

  try {
    // Total count
    const { count: totalCount } = await supabase
      .from('simulations')
      .select('*', { count: 'exact', head: true });

    console.log(`   Total simulations: ${totalCount || 0}`);

    // By status
    const { data: statusCounts } = await supabase
      .from('simulations')
      .select('status')
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        data?.forEach(s => {
          counts[s.status] = (counts[s.status] || 0) + 1;
        });
        return { data: counts };
      });

    if (statusCounts) {
      console.log('   By status:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`     ${status}: ${count}`);
      });
    }

    // Oldest simulation
    const { data: oldest } = await supabase
      .from('simulations')
      .select('created_at')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (oldest) {
      const age = Math.floor((Date.now() - new Date(oldest.created_at).getTime()) / (24 * 60 * 60 * 1000));
      console.log(`   Oldest simulation: ${age} days old`);
    }

    console.log('');

  } catch (error) {
    console.error('   ❌ Error fetching stats:', error);
  }
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  PayOS Simulation Cleanup Worker');
  console.log('  Story 28.7: Automatic Expiration and Cleanup');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const startTime = Date.now();

  // Step 1: Show current stats
  await getSimulationStats();

  // Step 2: Mark expired simulations
  const expiredCount = await markExpiredSimulations();

  // Step 3: Clean up old simulations
  const cleanupStats = await cleanupSimulations();

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Cleanup Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(`   Expired marked: ${expiredCount}`);
  console.log(`   Simulations analyzed: ${cleanupStats.totalSimulations}`);
  console.log(`   Simulations deleted: ${cleanupStats.deletedCount}`);
  console.log(`   Simulations preserved: ${cleanupStats.preservedCount}`);
  console.log(`   Errors: ${cleanupStats.errorCount}`);
  console.log('');

  if (cleanupStats.oldestDeleted && cleanupStats.newestDeleted) {
    console.log(`   Date range deleted:`);
    console.log(`     Oldest: ${cleanupStats.oldestDeleted}`);
    console.log(`     Newest: ${cleanupStats.newestDeleted}`);
    console.log('');
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`   Duration: ${duration}s`);
  console.log('');

  if (cleanupStats.errorCount > 0) {
    console.log('⚠️  Cleanup completed with errors');
    process.exit(1);
  } else {
    console.log('✅ Cleanup completed successfully');
    process.exit(0);
  }
}

main();



