-- RPC function to create a profile (bypasses PostgREST schema cache)
CREATE OR REPLACE FUNCTION public.create_profile(p_id uuid, p_full_name text, p_role text DEFAULT 'assistant')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (p_id, p_full_name, p_role);
END;
$$;

-- RPC function to update profile name
CREATE OR REPLACE FUNCTION public.update_profile_name(p_id uuid, p_full_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles SET full_name = p_full_name WHERE id = p_id;
END;
$$;

-- RPC function to get profile
CREATE OR REPLACE FUNCTION public.get_profile(p_id uuid)
RETURNS TABLE(id uuid, full_name text, role text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY SELECT profiles.id, profiles.full_name, profiles.role, profiles.created_at
  FROM public.profiles WHERE profiles.id = p_id;
END;
$$;

-- RPC function to get all profiles
CREATE OR REPLACE FUNCTION public.get_all_profiles()
RETURNS TABLE(id uuid, full_name text, role text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY SELECT profiles.id, profiles.full_name, profiles.role, profiles.created_at
  FROM public.profiles ORDER BY profiles.created_at DESC;
END;
$$;

SELECT pg_notify('pgrst', 'reload schema');
