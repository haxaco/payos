#!/usr/bin/env tsx

/**
 * Seed Account Relationships Script
 * 
 * Seeds the database with sample account relationships (contractors, employers, etc.).
 * This script should be run after the main seed-database script.
 * 
 * Usage: tsx seed-relationships.ts
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

async function getOrCreateRelationship(tenantId: string, relationship: any) {
  // Check if relationship already exists
  const { data: existing } = await supabase
    .from('account_relationships')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('account_id', relationship.accountId)
    .eq('related_account_id', relationship.relatedAccountId)
    .eq('relationship_type', relationship.relationshipType)
    .maybeSingle();
  
  if (existing) {
    console.log(`  ↷ Relationship already exists: ${relationship.relationshipType}`);
    return existing.id;
  }
  
  const { data, error } = await supabase
    .from('account_relationships')
    .insert({
      tenant_id: tenantId,
      account_id: relationship.accountId,
      related_account_id: relationship.relatedAccountId,
      relationship_type: relationship.relationshipType,
      status: relationship.status || 'active',
      notes: relationship.notes,
    })
    .select()
    .single();
  
  if (error) {
    console.error(`  ✗ Failed to create relationship: ${error.message}`);
    throw error;
  }
  
  return data.id;
}

// ============================================
// Main Seeding Function
// ============================================

async function seedRelationships() {
  console.log('🌱 Seeding account relationships...\n');
  
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
    
    // Get accounts to create relationships between
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('id, name, type')
      .eq('tenant_id', tenantId)
      .order('name');
    
    if (accountsError || !accounts || accounts.length === 0) {
      console.error('❌ No accounts found for this tenant.');
      console.error('   Please ensure seed-database.ts has been run.');
      process.exit(1);
    }
    
    console.log(`✓ Found ${accounts.length} accounts\n`);
    
    // Map accounts by name for easy reference
    const accountsByName: Record<string, any> = {};
    accounts.forEach(acc => {
      accountsByName[acc.name] = acc;
    });
    
    // ============================================
    // Create Sample Relationships
    // ============================================
    
    console.log('1️⃣  Creating relationships...\n');
    
    let createdCount = 0;
    
    // TechCorp Inc has contractors
    if (accountsByName['TechCorp Inc']) {
      const techCorpId = accountsByName['TechCorp Inc'].id;
      
      // Maria Garcia is a contractor for TechCorp
      if (accountsByName['Maria Garcia']) {
        await getOrCreateRelationship(tenantId, {
          accountId: techCorpId,
          relatedAccountId: accountsByName['Maria Garcia'].id,
          relationshipType: 'contractor',
          notes: 'Senior Frontend Developer - Monthly retainer',
        });
        console.log(`  ✓ TechCorp Inc → Maria Garcia (contractor)`);
        createdCount++;
        
        // Reverse relationship: Maria has TechCorp as employer
        await getOrCreateRelationship(tenantId, {
          accountId: accountsByName['Maria Garcia'].id,
          relatedAccountId: techCorpId,
          relationshipType: 'employer',
          notes: 'Primary client - Monthly retainer',
        });
        console.log(`  ✓ Maria Garcia → TechCorp Inc (employer)`);
        createdCount++;
      }
      
      // Ana Silva is a contractor for TechCorp
      if (accountsByName['Ana Silva']) {
        await getOrCreateRelationship(tenantId, {
          accountId: techCorpId,
          relatedAccountId: accountsByName['Ana Silva'].id,
          relationshipType: 'contractor',
          notes: 'Backend Developer - Monthly retainer',
        });
        console.log(`  ✓ TechCorp Inc → Ana Silva (contractor)`);
        createdCount++;
        
        // Reverse relationship
        await getOrCreateRelationship(tenantId, {
          accountId: accountsByName['Ana Silva'].id,
          relatedAccountId: techCorpId,
          relationshipType: 'employer',
          notes: 'Primary client - Monthly retainer',
        });
        console.log(`  ✓ Ana Silva → TechCorp Inc (employer)`);
        createdCount++;
      }
      
      // Carlos Martinez is a contractor for TechCorp
      if (accountsByName['Carlos Martinez']) {
        await getOrCreateRelationship(tenantId, {
          accountId: techCorpId,
          relatedAccountId: accountsByName['Carlos Martinez'].id,
          relationshipType: 'contractor',
          notes: 'DevOps Engineer - Part-time',
        });
        console.log(`  ✓ TechCorp Inc → Carlos Martinez (contractor)`);
        createdCount++;
        
        // Reverse relationship
        await getOrCreateRelationship(tenantId, {
          accountId: accountsByName['Carlos Martinez'].id,
          relatedAccountId: techCorpId,
          relationshipType: 'employer',
          notes: 'Part-time engagement',
        });
        console.log(`  ✓ Carlos Martinez → TechCorp Inc (employer)`);
        createdCount++;
      }
    }
    
    // StartupXYZ has contractors
    if (accountsByName['StartupXYZ']) {
      const startupId = accountsByName['StartupXYZ'].id;
      
      // Juan Perez is a contractor for StartupXYZ
      if (accountsByName['Juan Perez']) {
        await getOrCreateRelationship(tenantId, {
          accountId: startupId,
          relatedAccountId: accountsByName['Juan Perez'].id,
          relationshipType: 'contractor',
          notes: 'UX Designer - Project-based',
        });
        console.log(`  ✓ StartupXYZ → Juan Perez (contractor)`);
        createdCount++;
        
        // Reverse relationship
        await getOrCreateRelationship(tenantId, {
          accountId: accountsByName['Juan Perez'].id,
          relatedAccountId: startupId,
          relationshipType: 'employer',
          notes: 'Project-based work',
        });
        console.log(`  ✓ Juan Perez → StartupXYZ (employer)`);
        createdCount++;
      }
      
      // Sofia Rodriguez is a contractor for StartupXYZ
      if (accountsByName['Sofia Rodriguez']) {
        await getOrCreateRelationship(tenantId, {
          accountId: startupId,
          relatedAccountId: accountsByName['Sofia Rodriguez'].id,
          relationshipType: 'contractor',
          notes: 'Senior Consultant - Quarterly engagements',
        });
        console.log(`  ✓ StartupXYZ → Sofia Rodriguez (contractor)`);
        createdCount++;
        
        // Reverse relationship
        await getOrCreateRelationship(tenantId, {
          accountId: accountsByName['Sofia Rodriguez'].id,
          relatedAccountId: startupId,
          relationshipType: 'employer',
          notes: 'Quarterly consulting work',
        });
        console.log(`  ✓ Sofia Rodriguez → StartupXYZ (employer)`);
        createdCount++;
      }
    }
    
    // Business-to-business relationships
    if (accountsByName['TechCorp Inc'] && accountsByName['StartupXYZ']) {
      // TechCorp is a vendor for StartupXYZ
      await getOrCreateRelationship(tenantId, {
        accountId: accountsByName['StartupXYZ'].id,
        relatedAccountId: accountsByName['TechCorp Inc'].id,
        relationshipType: 'vendor',
        notes: 'Software development services',
      });
      console.log(`  ✓ StartupXYZ → TechCorp Inc (vendor)`);
      createdCount++;
      
      // Reverse: StartupXYZ is a customer of TechCorp
      await getOrCreateRelationship(tenantId, {
        accountId: accountsByName['TechCorp Inc'].id,
        relatedAccountId: accountsByName['StartupXYZ'].id,
        relationshipType: 'customer',
        notes: 'B2B software development client',
      });
      console.log(`  ✓ TechCorp Inc → StartupXYZ (customer)`);
      createdCount++;
    }
    
    console.log('');
    
    // ============================================
    // Summary
    // ============================================
    
    const { data: relationshipCount } = await supabase
      .from('account_relationships')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    
    console.log('✅ Relationships seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   Relationships created in this run: ${createdCount}`);
    console.log(`   Total relationships in database: ${relationshipCount?.length || 0}`);
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

seedRelationships().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});


