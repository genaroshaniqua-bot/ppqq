create or replace function public.admin_moderate_service(
  target_service_id uuid,
  next_active boolean,
  moderation_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_active boolean;
begin
  if not public.is_admin() then raise exception 'admin access required'; end if;
  if length(trim(moderation_reason)) < 4 then raise exception 'moderation reason is required'; end if;

  select is_active into previous_active from public.artist_services where id = target_service_id for update;
  if previous_active is null then raise exception 'service not found'; end if;

  update public.artist_services set is_active = next_active where id = target_service_id;
  insert into public.platform_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (
    auth.uid(),
    'admin_moderate_service',
    'artist_service',
    target_service_id::text,
    jsonb_build_object('previous_active', previous_active, 'next_active', next_active, 'reason', trim(moderation_reason))
  );
end;
$$;

revoke all on function public.admin_moderate_service(uuid, boolean, text) from public;
grant execute on function public.admin_moderate_service(uuid, boolean, text) to authenticated;
