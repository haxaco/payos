-- ============================================================================
-- Migration: notifications (In-app dashboard notifications)
--
-- Backs the dashboard notifications drawer (previously 100% mock). Stores
-- per-tenant notification rows that can be either tenant-wide (user_id NULL)
-- or targeted to a single dashboard user (user_id set). Producers across the
-- API (production-access decisions, transfer completion/failure, ...) insert
-- rows fire-and-forget via services/notifications.ts.
--
-- RLS model (matches auth_scope_grants / tenant_production_access):
--   The API uses the SERVICE-ROLE client (src/db/client.ts), which bypasses
--   RLS entirely; tenant isolation is enforced in application code (every
--   query filters by tenant_id + recipient). RLS is still ENABLED with a
--   tenant-scoped SELECT policy for the `authenticated` role so that any
--   direct Supabase-auth read (e.g. future client-side access) cannot leak
--   across tenants. No INSERT/UPDATE/DELETE policy is granted — all writes
--   go through the service-role API path, same convention as auth_scope_*.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  user_id     UUID,
  type        TEXT NOT NULL CHECK (type IN ('agent_action','stream_alert','compliance','system')),
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  href        TEXT,
  read        BOOLEAN NOT NULL DEFAULT false,
  read_at     TIMESTAMPTZ,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Newest-first list per tenant (the GET / drawer query).
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_created
  ON public.notifications (tenant_id, created_at DESC);

-- Unread-count + unread-filter fast path.
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_unread
  ON public.notifications (tenant_id)
  WHERE read = false;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_tenant_read"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
    )
  );

COMMENT ON TABLE public.notifications IS
  'In-app dashboard notifications. tenant-wide when user_id IS NULL, '
  'targeted when user_id is set. Written fire-and-forget by API producers '
  'via the service-role client; reads are tenant+recipient scoped in app code.';
COMMENT ON COLUMN public.notifications.user_id IS
  'NULL = tenant-wide (visible to every user in the tenant). Non-NULL = '
  'targeted to one dashboard user.';

DO $$
BEGIN
  RAISE NOTICE '✅ notifications table created (tenant-wide + targeted)';
  RAISE NOTICE '✅ indexes: (tenant_id, created_at desc) + partial (tenant_id) where read=false';
  RAISE NOTICE '✅ RLS enabled + tenant-scoped SELECT policy (service-role writes, app-level tenant filtering)';
END $$;
