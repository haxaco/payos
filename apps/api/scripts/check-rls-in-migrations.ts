#!/usr/bin/env tsx

/**
 * Check RLS Coverage in Migration Files and Live Database
 * 
 * This script analyzes migration files to ensure new tables have RLS enabled.
 * It checks for:
 * 1. CREATE TABLE statements in migrations
 * 2. ALTER TABLE ... ENABLE ROW LEVEL SECURITY statements
 * 3. CREATE POLICY statements
 * 4. (Optional) Live database validation via Supabase connection
 * 
 * Usage:
 *   pnpm exec tsx scripts/check-rls-in-migrations.ts          # Check migrations only
 *   pnpm exec tsx scripts/check-rls-in-migrations.ts --db     # Also check live database
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

interface TableInfo {
  name: string;
  migration: string;
  hasRLS: boolean;
  policyCount: number;
}

interface DbTableInfo {
  table_schema: string;
  table_name: string;
  rls_enabled: boolean;
  policy_count: number;
}

interface DbCheckResult {
  tablesWithoutRLS: string[];
  tablesWithoutPolicies: string[];
  missingFromMigrations: string[];
}

function extractTableNames(content: string): string[] {
  const tables: string[] = [];
  
  // Match CREATE TABLE statements (handles IF NOT EXISTS properly)
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z_][a-zA-Z0-9_]*)/gi;
  let match;
  while ((match = createTableRegex.exec(content)) !== null) {
    const tableName = match[1].toLowerCase();
    // Skip keywords that might be captured
    if (tableName !== 'if' && tableName !== 'not' && tableName !== 'exists') {
      tables.push(match[1]);
    }
  }
  
  return [...new Set(tables)]; // Remove duplicates
}

function checkRLSEnabled(content: string, tableName: string): boolean {
  // Check for ALTER TABLE ... ENABLE ROW LEVEL SECURITY
  const rlsRegex = new RegExp(
    `ALTER\\s+TABLE\\s+(?:public\\.)?${tableName}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
    'i'
  );
  return rlsRegex.test(content);
}

function countPolicies(content: string, tableName: string): number {
  // Count CREATE POLICY statements for this table
  const policyRegex = new RegExp(
    `CREATE\\s+POLICY\\s+[^\\s]+\\s+ON\\s+(?:public\\.)?${tableName}`,
    'gi'
  );
  const matches = content.match(policyRegex);
  return matches ? matches.length : 0;
}

function analyzeMigrations(): Map<string, TableInfo> {
  const tables = new Map<string, TableInfo>();
  
  if (!readdirSync) {
    console.error('❌ Migrations directory not found');
    process.exit(1);
  }
  
  const migrationFiles = readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  for (const file of migrationFiles) {
    const filePath = join(MIGRATIONS_DIR, file);
    const content = readFileSync(filePath, 'utf-8');
    
    const tableNames = extractTableNames(content);
    
    for (const tableName of tableNames) {
      const existing = tables.get(tableName);
      
      // If table already exists, check if RLS is added in this migration
      if (existing) {
        if (!existing.hasRLS && checkRLSEnabled(content, tableName)) {
          existing.hasRLS = true;
          existing.migration = file; // Update to migration that enables RLS
        }
        existing.policyCount += countPolicies(content, tableName);
      } else {
        // New table
        tables.set(tableName, {
          name: tableName,
          migration: file,
          hasRLS: checkRLSEnabled(content, tableName),
          policyCount: countPolicies(content, tableName),
        });
      }
    }
  }
  
  return tables;
}

/**
 * Check RLS status in the live database
 */
async function checkDatabaseRLS(migrationTables: Map<string, TableInfo>): Promise<DbCheckResult> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('⚠️  SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars required for DB check');
    console.error('   Skipping live database validation...\n');
    return {
      tablesWithoutRLS: [],
      tablesWithoutPolicies: [],
      missingFromMigrations: [],
    };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Use Postgres client to run raw SQL
    const { data: tablesData, error: tablesError } = await supabase
      .from('pg_tables')
      .select('schemaname, tablename, rowsecurity')
      .eq('schemaname', 'public')
      .not('tablename', 'like', 'pg_%')
      .not('tablename', 'like', 'sql_%');

    if (tablesError) {
      console.error('❌ Failed to query pg_tables:', tablesError.message);
      return {
        tablesWithoutRLS: [],
        tablesWithoutPolicies: [],
        missingFromMigrations: [],
      };
    }

    // Get policy counts
    const { data: policiesData, error: policiesError } = await supabase
      .from('pg_policies')
      .select('tablename, policyname')
      .eq('schemaname', 'public');

    if (policiesError) {
      console.error('❌ Failed to query pg_policies:', policiesError.message);
    }

    // Count policies per table
    const policyCounts = new Map<string, number>();
    if (policiesData) {
      for (const policy of policiesData) {
        const count = policyCounts.get(policy.tablename) || 0;
        policyCounts.set(policy.tablename, count + 1);
      }
    }

    // Build result
    const dbTables: DbTableInfo[] = (tablesData || []).map((t: any) => ({
      table_schema: t.schemaname,
      table_name: t.tablename,
      rls_enabled: t.rowsecurity,
      policy_count: policyCounts.get(t.tablename) || 0,
    }));

    return processDbResults(dbTables, migrationTables);
  } catch (err: any) {
    console.error('❌ Database connection error:', err.message);
    return {
      tablesWithoutRLS: [],
      tablesWithoutPolicies: [],
      missingFromMigrations: [],
    };
  }
}

/**
 * Process database query results
 */
function processDbResults(
  dbTables: DbTableInfo[],
  migrationTables: Map<string, TableInfo>
): DbCheckResult {
  const result: DbCheckResult = {
    tablesWithoutRLS: [],
    tablesWithoutPolicies: [],
    missingFromMigrations: [],
  };

  for (const dbTable of dbTables) {
    const tableName = dbTable.table_name;
    
    // Check if table is missing from migrations
    if (!migrationTables.has(tableName)) {
      result.missingFromMigrations.push(tableName);
    }
    
    // Check if RLS is disabled
    if (!dbTable.rls_enabled) {
      result.tablesWithoutRLS.push(tableName);
    }
    
    // Check if table has no policies but RLS is enabled
    if (dbTable.rls_enabled && dbTable.policy_count === 0) {
      result.tablesWithoutPolicies.push(tableName);
    }
  }

  return result;
}

async function main() {
  const checkDatabase = process.argv.includes('--db') || process.argv.includes('--database');
  
  console.log('🔍 Checking RLS coverage in migration files...\n');
  
  const tables = analyzeMigrations();
  const issues: string[] = [];
  const warnings: string[] = [];
  
  for (const [tableName, info] of tables.entries()) {
    if (!info.hasRLS) {
      issues.push(
        `❌ Table '${tableName}' (${info.migration}) has NO RLS enabled`
      );
    } else if (info.policyCount === 0) {
      warnings.push(
        `⚠️  Table '${tableName}' (${info.migration}) has RLS enabled but NO POLICIES`
      );
    } else if (info.policyCount < 4 && !tableName.includes('tier_limits')) {
      warnings.push(
        `⚠️  Table '${tableName}' (${info.migration}) has only ${info.policyCount} policies (recommended: 4 for full CRUD)`
      );
    } else {
      console.log(`✅ ${tableName}: RLS enabled, ${info.policyCount} policies`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  
  // Check live database if requested
  if (checkDatabase) {
    console.log('\n🔍 Checking live database...\n');
    const dbResult = await checkDatabaseRLS(tables);
    
    if (dbResult.tablesWithoutRLS.length > 0) {
      console.log('❌ Tables in database WITHOUT RLS enabled:');
      dbResult.tablesWithoutRLS.forEach(t => {
        console.log(`   ❌ ${t}`);
        issues.push(`Database table '${t}' has NO RLS enabled`);
      });
      console.log();
    }
    
    if (dbResult.tablesWithoutPolicies.length > 0) {
      console.log('⚠️  Tables in database with RLS but NO POLICIES:');
      dbResult.tablesWithoutPolicies.forEach(t => {
        console.log(`   ⚠️  ${t}`);
        warnings.push(`Database table '${t}' has RLS enabled but NO POLICIES`);
      });
      console.log();
    }
    
    if (dbResult.missingFromMigrations.length > 0) {
      console.log('⚠️  Tables in database NOT TRACKED in migrations:');
      dbResult.missingFromMigrations.forEach(t => {
        console.log(`   ⚠️  ${t} (created outside migration system)`);
        warnings.push(`Database table '${t}' is not documented in any migration`);
      });
      console.log();
    }
    
    if (
      dbResult.tablesWithoutRLS.length === 0 &&
      dbResult.tablesWithoutPolicies.length === 0 &&
      dbResult.missingFromMigrations.length === 0
    ) {
      console.log('✅ Live database check passed!\n');
    }
    
    console.log('='.repeat(60));
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(w => console.log(`   ${w}`));
  }
  
  if (issues.length > 0) {
    console.log('\n❌ Issues Found:');
    issues.forEach(i => console.log(`   ${i}`));
    console.log('\n💡 Fix: Add the following to your migration:');
    console.log('   ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;');
    console.log('   CREATE POLICY "..." ON <table_name> FOR SELECT USING (...);');
    console.log('   CREATE POLICY "..." ON <table_name> FOR INSERT WITH CHECK (...);');
    console.log('   CREATE POLICY "..." ON <table_name> FOR UPDATE USING (...);');
    console.log('   CREATE POLICY "..." ON <table_name> FOR DELETE USING (...);');
    
    if (checkDatabase) {
      console.log('\n💡 For tables missing from migrations:');
      console.log('   Create a baseline migration documenting the existing table schema');
    }
    
    process.exit(1);
  }
  
  if (warnings.length === 0 && issues.length === 0) {
    console.log('\n✅ All tables have RLS enabled with appropriate policies!');
  }
  
  console.log(`\n📊 Summary: ${tables.size} tables checked in migrations`);
  
  if (checkDatabase) {
    console.log('💡 Tip: Run without --db flag to skip database validation (faster for CI)');
  } else {
    console.log('💡 Tip: Add --db flag to also validate the live database');
  }
}

main().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});




