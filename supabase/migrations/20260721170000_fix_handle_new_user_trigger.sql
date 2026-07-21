CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, email, first_name, last_name, avatar_url, xp, level, streak, badges, total_xp, is_admin, referral_code)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', ''),
    100,
    2,
    0,
    ARRAY['newcomer']::text[],
    100,
    case when not exists (select 1 from public.profiles) then true else false end,
    'SKDZ-' || upper(substring(md5(random()::text), 1, 8))
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;
