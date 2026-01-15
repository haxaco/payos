-- Migration: Create user_sessions table for session security
-- Story: 11.12 Session Security
-- Date: 2025-12-17

-- ============================================
-- Create user_sessions table
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Token management
  refresh_token_hash TEXT NOT NULL,
  is_used BOOLEAN DEFAULT false,  -- For rotation detection
  
  -- Client information
  device_fingerprint TEXT,
  ip_address TEXT,
  user_agent TEXT,
  
  -- Lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT user_sessions_expires_at_check CHECK (expires_at > created_at)
);

-- ============================================
-- Indexes
-- ============================================

-- Find active sessions for a user
CREATE INDEX idx_user_sessions_user_active 
  ON public.user_sessions(user_id, created_at DESC) 
  WHERE revoked_at IS NULL AND expires_at > NOW();

-- Find session by token hash (for refresh operations)
CREATE INDEX idx_user_sessions_token_hash 
  ON public.user_sessions(refresh_token_hash) 
  WHERE revoked_at IS NULL AND is_used = false;

-- Cleanup expired sessions
CREATE INDEX idx_user_sessions_expired 
  ON public.user_sessions(expires_at) 
  WHERE revoked_at IS NULL;

-- ============================================
-- Row Level Security
-- ============================================

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY user_sessions_select_own ON public.user_sessions
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can delete their own sessions (logout)
CREATE POLICY user_sessions_delete_own ON public.user_sessions
  FOR DELETE
  USING (user_id = auth.uid());

-- Service role can do everything (for refresh/revocation)
CREATE POLICY user_sessions_service_all ON public.user_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Functions
-- ============================================

-- Function to clean up expired sessions (run via cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete sessions that expired more than 7 days ago
  DELETE FROM public.user_sessions
  WHERE expires_at < NOW() - INTERVAL '7 days'
    AND revoked_at IS NULL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Function to revoke all user sessions (security breach response)
CREATE OR REPLACE FUNCTION public.revoke_all_user_sessions(target_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  revoked_count INTEGER;
BEGIN
  -- Revoke all active sessions for the user
  UPDATE public.user_sessions
  SET revoked_at = NOW()
  WHERE user_id = target_user_id
    AND revoked_at IS NULL;
  
  GET DIAGNOSTICS revoked_count = ROW_COUNT;
  
  RETURN revoked_count;
END;
$$;

-- Function to mark refresh token as used
CREATE OR REPLACE FUNCTION public.mark_refresh_token_used(token_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_sessions
  SET 
    is_used = true,
    last_activity_at = NOW()
  WHERE refresh_token_hash = token_hash
    AND revoked_at IS NULL
    AND is_used = false;
  
  RETURN FOUND;
END;
$$;

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE public.user_sessions IS 'Secure session management with refresh token rotation';
COMMENT ON COLUMN public.user_sessions.refresh_token_hash IS 'SHA-256 hash of the refresh token';
COMMENT ON COLUMN public.user_sessions.is_used IS 'Tracks if refresh token has been used (for rotation detection)';
COMMENT ON COLUMN public.user_sessions.device_fingerprint IS 'Client device fingerprint for anomaly detection';
COMMENT ON FUNCTION public.cleanup_expired_sessions() IS 'Deletes expired sessions older than 7 days';
COMMENT ON FUNCTION public.revoke_all_user_sessions(UUID) IS 'Revokes all sessions for a user (security breach response)';
COMMENT ON FUNCTION public.mark_refresh_token_used(TEXT) IS 'Marks a refresh token as used for rotation detection';






