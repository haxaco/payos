-- ============================================
-- Set JWT app_tenant_id Claim Function
-- ============================================
-- This function sets the app_tenant_id claim in the JWT based on the user's profile.
-- It's called automatically by Supabase Auth when a user logs in.

CREATE OR REPLACE FUNCTION public.get_tenant_id_for_user(user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  tenant_uuid UUID;
BEGIN
  SELECT tenant_id INTO tenant_uuid
  FROM public.user_profiles
  WHERE id = user_id;
  
  RETURN tenant_uuid;
END;
$$;

-- Create a trigger function that sets the claim when JWT is issued
-- Note: Supabase doesn't support custom claims in JWT directly
-- We need to use a different approach - set it via request.jwt.claims

-- Alternative: Use a database function in RLS policies
-- But actually, we can't modify the JWT after it's issued
-- The solution is to use user_metadata or a custom function

-- For now, we'll use a helper function that RLS policies can call
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
  user_uuid UUID;
  tenant_uuid UUID;
BEGIN
  -- Get user ID from JWT
  user_uuid := (auth.jwt() ->> 'sub')::uuid;
  
  IF user_uuid IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get tenant_id from user_profiles
  SELECT tenant_id INTO tenant_uuid
  FROM public.user_profiles
  WHERE id = user_uuid;
  
  RETURN tenant_uuid;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id() TO authenticated;


