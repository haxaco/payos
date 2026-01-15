-- Migration: Add indexes for simulation cleanup and queries
-- Story 28.7: Simulation Expiration and Cleanup
-- Created: 2026-01-04

-- Index on expires_at for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_simulations_expires_at 
ON simulations(expires_at) 
WHERE status != 'executed';

-- Index on created_at for cleanup worker (finding old simulations)
CREATE INDEX IF NOT EXISTS idx_simulations_created_at 
ON simulations(created_at);

-- Index on status for filtering queries
CREATE INDEX IF NOT EXISTS idx_simulations_status 
ON simulations(status);

-- Composite index for tenant + status queries (common pattern)
CREATE INDEX IF NOT EXISTS idx_simulations_tenant_status 
ON simulations(tenant_id, status);

-- Index on executed flag for cleanup logic
CREATE INDEX IF NOT EXISTS idx_simulations_executed 
ON simulations(executed) 
WHERE executed = true;

-- Comment on indexes
COMMENT ON INDEX idx_simulations_expires_at IS 'Optimizes expiration checks and cleanup queries';
COMMENT ON INDEX idx_simulations_created_at IS 'Optimizes cleanup worker queries for old simulations';
COMMENT ON INDEX idx_simulations_status IS 'Optimizes status-based filtering';
COMMENT ON INDEX idx_simulations_tenant_status IS 'Optimizes tenant-scoped status queries';
COMMENT ON INDEX idx_simulations_executed IS 'Optimizes cleanup preservation logic for executed simulations';



