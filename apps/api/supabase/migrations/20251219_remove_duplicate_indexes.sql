-- ============================================
-- Migration: Remove Duplicate Indexes
-- Story: 16.10
-- Date: 2025-12-19
-- Purpose: Remove duplicate indexes on documents table to reduce
--          storage overhead and improve write performance
-- ============================================

-- ============================================
-- Analysis of Duplicate Indexes
-- ============================================

-- The documents table has two indexes that serve similar purposes:
-- 1. idx_documents_tenant_type - Indexes (tenant_id, type)
-- 2. idx_documents_type - Indexes (type) only
--
-- Since we always filter by tenant_id (due to RLS), the first index
-- (idx_documents_tenant_type) is more useful and covers all use cases.
-- The second index (idx_documents_type) is redundant.

-- ============================================
-- Check if indexes exist before dropping
-- ============================================

DO $$
DECLARE
  v_idx_exists BOOLEAN;
BEGIN
  -- Check if idx_documents_type exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'documents'
      AND indexname = 'idx_documents_type'
  ) INTO v_idx_exists;
  
  IF v_idx_exists THEN
    RAISE NOTICE '📋 Found duplicate index: idx_documents_type';
    RAISE NOTICE '   Keeping: idx_documents_tenant_type (more selective)';
    RAISE NOTICE '   Dropping: idx_documents_type (redundant)';
  ELSE
    RAISE NOTICE 'ℹ️  Index idx_documents_type does not exist or was already removed';
  END IF;
END $$;

-- ============================================
-- Drop Redundant Index
-- ============================================

-- Drop the redundant index if it exists
DROP INDEX IF EXISTS public.idx_documents_type;

-- ============================================
-- Verify Remaining Indexes
-- ============================================

DO $$
DECLARE
  v_idx_count INT;
  v_has_tenant_type_idx BOOLEAN;
BEGIN
  -- Count total indexes on documents table
  SELECT COUNT(*)
  INTO v_idx_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'documents';
  
  -- Check if the good index still exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'documents'
      AND indexname = 'idx_documents_tenant_type'
  ) INTO v_has_tenant_type_idx;
  
  IF NOT v_has_tenant_type_idx THEN
    RAISE WARNING '⚠️  idx_documents_tenant_type not found! This index is required for performance.';
  ELSE
    RAISE NOTICE '✅ idx_documents_tenant_type exists (good index retained)';
  END IF;
  
  RAISE NOTICE '📊 Total indexes on documents table: %', v_idx_count;
END $$;

-- ============================================
-- Create Composite Index if Missing
-- ============================================

-- Ensure the good composite index exists
-- (This is safe to run multiple times due to IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_documents_tenant_type
  ON public.documents(tenant_id, type);

-- ============================================
-- Performance Impact
-- ============================================

DO $$
DECLARE
  v_table_size TEXT;
  v_indexes_size TEXT;
BEGIN
  -- Show table and index sizes for reference
  SELECT 
    pg_size_pretty(pg_total_relation_size('public.documents')) as total,
    pg_size_pretty(pg_indexes_size('public.documents')) as indexes
  INTO v_table_size, v_indexes_size;
  
  RAISE NOTICE '📏 Documents table total size: %', v_table_size;
  RAISE NOTICE '📏 Indexes size: %', v_indexes_size;
END $$;

-- ============================================
-- Verification
-- ============================================

COMMENT ON TABLE documents IS 'Story 16.10: Removed duplicate index idx_documents_type. Retained idx_documents_tenant_type as it is more selective and covers all query patterns. Performance improvement: faster INSERTs/UPDATEs, reduced storage.';

-- ============================================
-- Expected Performance Improvements
-- ============================================

-- Benefits of removing duplicate index:
-- 1. Reduced index maintenance overhead on INSERT/UPDATE/DELETE
-- 2. Reduced storage usage (typically 10-30% of table size per index)
-- 3. Faster VACUUM operations
-- 4. No impact on SELECT performance (covered by remaining index)
--
-- The idx_documents_tenant_type index will handle queries like:
-- - WHERE tenant_id = ? AND type = ?  (both columns)
-- - WHERE tenant_id = ?                (first column only)
--
-- Note: Queries filtering ONLY by type (no tenant_id) will use
-- sequential scan, but this should never happen in production due
-- to RLS policies that always include tenant_id filter.


