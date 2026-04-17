-- Agent avatars — add avatar_url column + public storage bucket.
-- Uploads go through the API's service-role client (bypasses RLS).
-- The bucket is public-read so the dashboard can render images without signed URLs.

ALTER TABLE agents ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN agents.avatar_url IS
  'Public URL of the agent avatar image stored in the agent-avatars bucket. Null = use fallback icon.';

-- Storage bucket for agent avatars. Idempotent: skip if it already exists.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agent-avatars',
  'agent-avatars',
  true,
  2 * 1024 * 1024, -- 2 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS: service role has full access (the API uses service role for all
-- writes), anon/authenticated get read-only. The API route enforces per-tenant
-- ownership before calling storage.
DROP POLICY IF EXISTS "agent_avatars_public_read" ON storage.objects;
CREATE POLICY "agent_avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'agent-avatars');

DROP POLICY IF EXISTS "agent_avatars_service_write" ON storage.objects;
CREATE POLICY "agent_avatars_service_write"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'agent-avatars')
  WITH CHECK (bucket_id = 'agent-avatars');
