#!/usr/bin/env tsx

/**
 * Check RLS Coverage in Migration Files
 * 
 * This script analyzes migration files to ensure new tables have RLS enabled.
 * It checks for:
 * 1. CREATE TABLE statements
 * 2. ALTER TABLE ... ENABLE ROW LEVEL SECURITY statements
 * 3. CREATE POLICY statements
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

interface TableInfo {
  name: string;
  migration: string;
  hasRLS: boolean;
  policyCount: number;
}

function extractTableNames(content: string): string[] {
  const tables: string[] = [];
  
  // Match CREATE TABLE statements
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)/gi;
  let match;
  while ((match = createTableRegex.exec(content)) !== null) {
    tables.push(match[1]);
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

function main() {
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
    process.exit(1);
  }
  
  if (warnings.length === 0 && issues.length === 0) {
    console.log('\n✅ All tables have RLS enabled with appropriate policies!');
  }
  
  console.log(`\n📊 Summary: ${tables.size} tables checked`);
}

main();


