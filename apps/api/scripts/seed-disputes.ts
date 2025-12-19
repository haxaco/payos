#!/usr/bin/env tsx

/**
 * Seed Disputes Script
 * 
 * Seeds the database with sample disputes linked to real transfers.
 * This script should be run after the main seed-database script.
 * 
 * Usage: tsx seed-disputes.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// ============================================
// Helper Functions
// ============================================

async function getOrCreateDispute(tenantId: string, dispute: any) {
  // Check if dispute already exists for this transfer
  const { data: existing } = await supabase
    .from('disputes')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('transfer_id', dispute.transferId)
    .maybeSingle();
  
  if (existing) {
    console.log(`  ↷ Dispute already exists for transfer ${dispute.transferId}`);
    return existing.id;
  }
  
  // Calculate due date (30 days from creation for open disputes)
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  
  // Use only core fields that should exist
  const insertData: any = {
    tenant_id: tenantId,
    transfer_id: dispute.transferId,
    status: dispute.status,
    reason: dispute.reason,
    description: dispute.description,
    claimant_account_id: dispute.claimantAccountId,
    respondent_account_id: dispute.respondentAccountId,
    amount_disputed: dispute.amountDisputed,
  };
  
  // Add optional core fields
  if (dispute.requestedResolution) insertData.requested_resolution = dispute.requestedResolution;
  if (dispute.requestedAmount) insertData.requested_amount = dispute.requestedAmount;
  if (dispute.status !== 'resolved' && dueDate) insertData.due_date = dueDate.toISOString();
  
  const { data, error } = await supabase
    .from('disputes')
    .insert(insertData)
    .select()
    .single();
  
  if (error) {
    console.error(`  ✗ Failed to create dispute: ${error.message}`);
    throw error;
  }
  
  return data.id;
}

// ============================================
// Main Seeding Function
// ============================================

async function seedDisputes() {
  console.log('🌱 Seeding disputes...\n');
  
  try {
    // Get Acme Corporation tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('name', 'Acme Corporation')
      .single();
    
    if (tenantError || !tenant) {
      console.error('❌ Could not find Acme Corporation tenant.');
      console.error('   Please run seed-database.ts first.');
      process.exit(1);
    }
    
    const tenantId = tenant.id;
    console.log(`✓ Found tenant: Acme Corporation (${tenantId})\n`);
    
    // Get some transfers and accounts to link disputes to
    const { data: transfers, error: transfersError } = await supabase
      .from('transfers')
      .select('id, from_account_id, to_account_id, amount, from_account_name, to_account_name')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .limit(4);
    
    if (transfersError || !transfers || transfers.length === 0) {
      console.error('❌ No completed transfers found for this tenant.');
      console.error('   Please ensure seed-database.ts has been run.');
      process.exit(1);
    }
    
    console.log(`✓ Found ${transfers.length} completed transfers\n`);
    
    // ============================================
    // Create Sample Disputes
    // ============================================
    
    console.log('1️⃣  Creating disputes...\n');
    
    // Dispute 1: Open - Service not received
    if (transfers.length > 0) {
      const transfer = transfers[0];
      await getOrCreateDispute(tenantId, {
        transferId: transfer.id,
        status: 'open',
        reason: 'service_not_received',
        description: 'I paid for a service that was never delivered. Multiple attempts to contact the vendor have been unsuccessful.',
        claimantAccountId: transfer.to_account_id,
        respondentAccountId: transfer.from_account_id,
        amountDisputed: transfer.amount,
        requestedResolution: 'full_refund',
      });
      console.log(`  ✓ Created OPEN dispute: Service not received ($${transfer.amount})`);
      console.log(`    Claimant: ${transfer.to_account_name}`);
      console.log(`    Respondent: ${transfer.from_account_name}\n`);
    }
    
    // Dispute 2: Under Review - Incorrect amount
    if (transfers.length > 1) {
      const transfer = transfers[1];
      const disputedAmount = Math.floor(transfer.amount * 0.3); // Dispute 30% of amount
      await getOrCreateDispute(tenantId, {
        transferId: transfer.id,
        status: 'under_review',
        reason: 'amount_incorrect',
        description: `I was charged $${transfer.amount} instead of the agreed amount. I have the original invoice showing a different amount.`,
        claimantAccountId: transfer.to_account_id,
        respondentAccountId: transfer.from_account_id,
        amountDisputed: disputedAmount,
        requestedResolution: 'partial_refund',
        requestedAmount: disputedAmount,
      });
      console.log(`  ✓ Created UNDER_REVIEW dispute: Amount incorrect ($${disputedAmount} of $${transfer.amount})`);
      console.log(`    Claimant: ${transfer.to_account_name}`);
      console.log(`    Respondent: ${transfer.from_account_name}\n`);
    }
    
    // Dispute 3: Escalated - Duplicate charge
    if (transfers.length > 2) {
      const transfer = transfers[2];
      await getOrCreateDispute(tenantId, {
        transferId: transfer.id,
        status: 'escalated',
        reason: 'duplicate_charge',
        description: 'I was charged twice for the same service. Transaction IDs show identical amounts on consecutive days.',
        claimantAccountId: transfer.to_account_id,
        respondentAccountId: transfer.from_account_id,
        amountDisputed: transfer.amount,
        requestedResolution: 'full_refund',
      });
      console.log(`  ✓ Created ESCALATED dispute: Duplicate charge ($${transfer.amount})`);
      console.log(`    Claimant: ${transfer.to_account_name}`);
      console.log(`    Respondent: ${transfer.from_account_name}\n`);
    }
    
    // Dispute 4: Resolved - Quality issue
    if (transfers.length > 3) {
      const transfer = transfers[3];
      const refundAmount = Math.floor(transfer.amount * 0.5); // 50% refund
      await getOrCreateDispute(tenantId, {
        transferId: transfer.id,
        status: 'resolved',
        reason: 'quality_issue',
        description: 'The delivered product did not match the description. Quality was far below what was advertised. Resolved with partial refund.',
        claimantAccountId: transfer.to_account_id,
        respondentAccountId: transfer.from_account_id,
        amountDisputed: transfer.amount,
        requestedResolution: 'partial_refund',
        requestedAmount: refundAmount,
      });
      console.log(`  ✓ Created RESOLVED dispute: Quality issue ($${refundAmount} requested of $${transfer.amount})`);
      console.log(`    Claimant: ${transfer.to_account_name}`);
      console.log(`    Respondent: ${transfer.from_account_name}\n`);
    }
    
    // ============================================
    // Summary
    // ============================================
    
    const { data: disputeCount } = await supabase
      .from('disputes')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    
    console.log('✅ Disputes seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   Total disputes in database: ${disputeCount?.length || 0}`);
    console.log('');
    
  } catch (error: any) {
    console.error('\n❌ Seeding failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// ============================================
// Execute
// ============================================

seedDisputes().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

