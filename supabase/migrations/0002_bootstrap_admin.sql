update public.profiles
set display_name = 'OC Forge 管理员', role = 'admin', updated_at = now()
where id = (
  select id from auth.users where email = 'owner@oc-forge.dev'
);

revoke update on table public.profiles from authenticated;
grant update (display_name, avatar_url, bio, updated_at) on table public.profiles to authenticated;
