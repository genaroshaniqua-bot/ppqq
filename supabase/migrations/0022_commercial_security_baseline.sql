-- Commercial security baseline:
-- 1. expose only safe profile columns publicly;
-- 2. protect portfolio originals with RLS-backed signed URLs;
-- 3. force all order state changes through reviewed security-definer RPCs.

drop policy if exists "public profiles are readable" on public.profiles;
drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile"
on public.profiles for select
using (auth.uid() = id or public.is_admin());

drop view if exists public.public_profiles;
create view public.public_profiles
with (security_barrier = true)
as
select id, display_name, avatar_url, bio, created_at
from public.profiles;

revoke all on public.public_profiles from public;
grant select on public.public_profiles to anon, authenticated;

create or replace function public.portfolio_object_path(image_reference text)
returns text
language sql
immutable
strict
set search_path = public
as $$
  select split_part(
    case
      when position('/portfolios/' in image_reference) > 0
        then split_part(image_reference, '/portfolios/', 2)
      else image_reference
    end,
    '?',
    1
  );
$$;

revoke all on function public.portfolio_object_path(text) from public;
grant execute on function public.portfolio_object_path(text) to anon, authenticated;

update storage.buckets
set public = false
where id = 'portfolios';

insert into storage.buckets (id, name, public)
values ('product-media', 'product-media', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "public reads public media" on storage.objects;
drop policy if exists "public reads avatars" on storage.objects;
drop policy if exists "users read permitted portfolio media" on storage.objects;
drop policy if exists "users upload own media" on storage.objects;

create policy "public reads avatars"
on storage.objects for select
using (bucket_id in ('avatars', 'product-media'));

create policy "users upload own media"
on storage.objects for insert
with check (
  bucket_id in ('avatars', 'portfolios', 'product-media', 'commission-files')
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "users read permitted portfolio media"
on storage.objects for select
using (
  bucket_id = 'portfolios'
  and (
    exists (
      select 1
      from public.portfolios portfolio
      where public.portfolio_object_path(portfolio.image_url) = storage.objects.name
        and (
          portfolio.visibility = 'public'
          or portfolio.artist_id = auth.uid()
          or public.is_admin()
          or exists (
            select 1
            from public.portfolio_unlocks unlocked
            where unlocked.portfolio_id = portfolio.id
              and unlocked.viewer_id = auth.uid()
          )
        )
    )
    or exists (
      select 1
      from public.products product
      where product.is_active
        and public.portfolio_object_path(product.cover_url) = storage.objects.name
    )
  )
);

drop policy if exists "buyers manage shop orders" on public.shop_orders;
drop policy if exists "buyers read shop orders" on public.shop_orders;
create policy "buyers read shop orders"
on public.shop_orders for select
using (auth.uid() = buyer_id or public.is_admin());

drop policy if exists "order parties update orders" on public.commission_orders;

revoke insert, update, delete on public.shop_orders from anon, authenticated;
revoke insert, update, delete on public.shop_order_items from anon, authenticated;
revoke insert, update, delete on public.commission_orders from anon, authenticated;
