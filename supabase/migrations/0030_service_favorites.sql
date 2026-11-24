-- Favorites belong to the account and survive refreshes and device changes.
create table public.service_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  service_id uuid not null references public.artist_services(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, service_id)
);
create index service_favorites_service_idx on public.service_favorites(service_id);
alter table public.service_favorites enable row level security;
revoke all on public.service_favorites from public, anon, authenticated;
grant select, insert, delete on public.service_favorites to authenticated;
create policy own_service_favorites on public.service_favorites for all to authenticated
using (user_id = (select auth.uid()) and (select public.is_active_account()))
with check (user_id = (select auth.uid()) and (select public.is_active_account()));
notify pgrst, 'reload schema';
