CREATE OR REPLACE FUNCTION public.create_profile(p_id uuid, p_full_name text, p_role text DEFAULT 'assistant')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (p_id, p_full_name, p_role);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_profile(p_user_id uuid)
RETURNS SETOF public.profiles
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $function$
  SELECT * FROM public.profiles WHERE id = p_user_id;
$function$;

CREATE OR REPLACE FUNCTION public.get_all_profiles()
RETURNS SETOF public.profiles
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $function$
  SELECT * FROM public.profiles ORDER BY created_at DESC;
$function$;
