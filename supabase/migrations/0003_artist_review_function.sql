create or replace function public.review_artist_application(
  target_user_id uuid,
  decision public.artist_review_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin access required';
  end if;

  if decision not in ('approved', 'rejected') then
    raise exception 'invalid review decision';
  end if;

  update public.artist_profiles
  set review_status = decision,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where user_id = target_user_id;

  if not found then
    raise exception 'artist application not found';
  end if;

  if decision = 'approved' then
    update public.profiles set role = 'artist', updated_at = now() where id = target_user_id and role <> 'admin';
  elsif decision = 'rejected' then
    update public.profiles set role = 'user', updated_at = now() where id = target_user_id and role <> 'admin';
  end if;
end;
$$;

revoke all on function public.review_artist_application(uuid, public.artist_review_status) from public;
grant execute on function public.review_artist_application(uuid, public.artist_review_status) to authenticated;

