-- ============================================
-- RLS Coverage Audit Script
-- ============================================
-- This script generates a comprehensive report of Row-Level Security (RLS)
-- status across all tables in the public schema.
--
-- Usage: Run this script with psql or through Supabase SQL editor
-- Output: Table showing RLS status and policy counts for each table

-- Enable expanded display for better readability
\x auto

-- ============================================
-- RLS Coverage Report
-- ============================================

SELECT 
  schemaname AS schema,
  tablename AS table_name,
  CASE 
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END AS rls_status,
  (
    SELECT COUNT(*)
    FROM pg_policies
    WHERE schemaname = t.schemaname
    AND tablename = t.tablename
  ) AS policy_count,
  CASE 
    WHEN rowsecurity AND (
      SELECT COUNT(*)
      FROM pg_policies
      WHERE schemaname = t.schemaname
      AND tablename = t.tablename
    ) >= 4 THEN '✅ FULL'
    WHEN rowsecurity AND (
      SELECT COUNT(*)
      FROM pg_policies
      WHERE schemaname = t.schemaname
      AND tablename = t.tablename
    ) > 0 THEN '⚠️  PARTIAL'
    WHEN rowsecurity THEN '🔴 NO POLICIES'
    ELSE '🚨 NO RLS'
  END AS protection_level,
  (
    SELECT STRING_AGG(cmd::text, ', ')
    FROM pg_policies
    WHERE schemaname = t.schemaname
    AND tablename = t.tablename
  ) AS policy_commands
FROM (
  SELECT 
    schemaname,
    tablename,
    (
      SELECT relrowsecurity
      FROM pg_class
      WHERE relname = tablename
      AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = schemaname)
    ) AS rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public'
) t
ORDER BY 
  CASE 
    WHEN NOT rowsecurity THEN 1
    WHEN rowsecurity AND (SELECT COUNT(*) FROM pg_policies WHERE schemaname = t.schemaname AND tablename = t.tablename) = 0 THEN 2
    ELSE 3
  END,
  tablename;

-- ============================================
-- RLS Summary Statistics
-- ============================================

SELECT 
  'RLS COVERAGE SUMMARY' AS report_section,
  COUNT(*) AS total_tables,
  SUM(CASE WHEN rowsecurity THEN 1 ELSE 0 END) AS tables_with_rls,
  SUM(CASE WHEN NOT rowsecurity THEN 1 ELSE 0 END) AS tables_without_rls,
  ROUND(
    (SUM(CASE WHEN rowsecurity THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric) * 100,
    2
  ) AS rls_coverage_percent
FROM (
  SELECT 
    tablename,
    (
      SELECT relrowsecurity
      FROM pg_class
      WHERE relname = tablename
      AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) AS rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public'
) t;

-- ============================================
-- Detailed Policy Report for Tenant Tables
-- ============================================

SELECT 
  schemaname AS schema,
  tablename AS table_name,
  policyname AS policy_name,
  cmd AS operation,
  CASE 
    WHEN roles = '{public}' THEN 'PUBLIC'
    ELSE array_to_string(roles, ', ')
  END AS applies_to,
  pg_get_expr(qual, (schemaname || '.' || tablename)::regclass) AS using_expression,
  pg_get_expr(with_check, (schemaname || '.' || tablename)::regclass) AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- ============================================
-- Tables That Need Attention
-- ============================================

SELECT 
  'TABLES NEEDING ATTENTION' AS report_section,
  tablename AS table_name,
  CASE 
    WHEN NOT rowsecurity THEN '🚨 RLS NOT ENABLED'
    WHEN policy_count = 0 THEN '🔴 NO POLICIES DEFINED'
    WHEN policy_count < 4 THEN '⚠️  INCOMPLETE POLICIES (< 4)'
    ELSE '✅ FULLY PROTECTED'
  END AS issue,
  policy_count AS current_policies,
  4 - policy_count AS missing_policies
FROM (
  SELECT 
    tablename,
    (
      SELECT relrowsecurity
      FROM pg_class
      WHERE relname = tablename
      AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) AS rowsecurity,
    (
      SELECT COUNT(*)
      FROM pg_policies
      WHERE schemaname = 'public'
      AND tablename = t.tablename
    ) AS policy_count
  FROM pg_tables t
  WHERE schemaname = 'public'
  AND EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = t.tablename 
    AND column_name = 'tenant_id'
  )
) t
WHERE NOT rowsecurity OR policy_count < 4
ORDER BY 
  CASE 
    WHEN NOT rowsecurity THEN 1
    WHEN policy_count = 0 THEN 2
    ELSE 3
  END;

-- ============================================
-- Tenant Isolation Validation
-- ============================================

SELECT 
  'TENANT ISOLATION CHECK' AS report_section,
  tablename AS table_name,
  CASE 
    WHEN has_tenant_id AND rowsecurity AND policy_count >= 4 THEN '✅ ISOLATED'
    WHEN has_tenant_id AND rowsecurity AND policy_count > 0 THEN '⚠️  PARTIAL'
    WHEN has_tenant_id AND rowsecurity THEN '🔴 NO POLICIES'
    WHEN has_tenant_id THEN '🚨 NO RLS'
    ELSE 'N/A (no tenant_id)'
  END AS isolation_status
FROM (
  SELECT 
    t.tablename,
    EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = t.tablename 
      AND column_name = 'tenant_id'
    ) AS has_tenant_id,
    (
      SELECT relrowsecurity
      FROM pg_class
      WHERE relname = t.tablename
      AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) AS rowsecurity,
    (
      SELECT COUNT(*)
      FROM pg_policies
      WHERE schemaname = 'public'
      AND tablename = t.tablename
    ) AS policy_count
  FROM pg_tables t
  WHERE schemaname = 'public'
) t
ORDER BY 
  CASE 
    WHEN has_tenant_id AND NOT rowsecurity THEN 1
    WHEN has_tenant_id AND policy_count = 0 THEN 2
    WHEN has_tenant_id AND policy_count < 4 THEN 3
    ELSE 4
  END,
  tablename;






