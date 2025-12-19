-- Migration: Create account_relationships table
-- Description: Stores relationships between accounts (contractors, employers, vendors, customers, etc.)
-- Date: 2025-12-17

-- ============================================
-- Create account_relationships table
-- ============================================

CREATE TABLE account_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  related_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL CHECK (relationship_type IN (
    'contractor', 'employer', 'vendor', 'customer', 'partner'
  )),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate relationships
  UNIQUE(tenant_id, account_id, related_account_id, relationship_type),
  
  -- Prevent self-relationships
  CHECK (account_id != related_account_id)
);

-- ============================================
-- Create indexes for performance
-- ============================================

-- Index for lookups by account
CREATE INDEX idx_account_relationships_account 
  ON account_relationships(tenant_id, account_id);

-- Index for lookups by related account
CREATE INDEX idx_account_relationships_related 
  ON account_relationships(tenant_id, related_account_id);

-- Index for lookups by relationship type
CREATE INDEX idx_account_relationships_type 
  ON account_relationships(tenant_id, relationship_type);

-- Index for status filtering
CREATE INDEX idx_account_relationships_status 
  ON account_relationships(tenant_id, status);

-- ============================================
-- Enable Row Level Security
-- ============================================

ALTER TABLE account_relationships ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies
-- ============================================

-- Policy: Tenants can view their own relationships
CREATE POLICY "Tenants can view their own relationships" 
  ON account_relationships
  FOR SELECT 
  USING (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

-- Policy: Tenants can insert their own relationships
CREATE POLICY "Tenants can insert their own relationships" 
  ON account_relationships
  FOR INSERT 
  WITH CHECK (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

-- Policy: Tenants can update their own relationships
CREATE POLICY "Tenants can update their own relationships" 
  ON account_relationships
  FOR UPDATE 
  USING (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

-- Policy: Tenants can delete their own relationships
CREATE POLICY "Tenants can delete their own relationships" 
  ON account_relationships
  FOR DELETE 
  USING (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

-- ============================================
-- Trigger for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_account_relationships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER account_relationships_updated_at
  BEFORE UPDATE ON account_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_account_relationships_updated_at();

-- ============================================
-- Comments for documentation
-- ============================================

COMMENT ON TABLE account_relationships IS 'Stores relationships between accounts (contractors, employers, vendors, etc.)';
COMMENT ON COLUMN account_relationships.relationship_type IS 'Type of relationship: contractor, employer, vendor, customer, partner';
COMMENT ON COLUMN account_relationships.status IS 'Status of relationship: active or inactive';
COMMENT ON COLUMN account_relationships.notes IS 'Optional notes about the relationship';


