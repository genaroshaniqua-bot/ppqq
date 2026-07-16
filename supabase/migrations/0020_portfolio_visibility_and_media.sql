alter table public.portfolios
  add column if not exists category text not null default '其他',
  add column if not exists visibility text not null default 'public',
  add column if not exists access_price integer not null default 0;

alter table public.portfolios drop constraint if exists portfolios_visibility_check;
alter table public.portfolios add constraint portfolios_visibility_check
  check (visibility in ('public', 'paid'));
alter table public.portfolios drop constraint if exists portfolios_access_price_check;
alter table public.portfolios add constraint portfolios_access_price_check
  check ((visibility = 'public' and access_price = 0) or (visibility = 'paid' and access_price > 0));

create table if not exists public.portfolio_unlocks (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  points_paid integer not null check (points_paid > 0),
  created_at timestamptz not null default now(),
  unique (portfolio_id, viewer_id)
);

alter table public.portfolio_unlocks enable row level security;
drop policy if exists "viewers read own portfolio unlocks" on public.portfolio_unlocks;
create policy "viewers read own portfolio unlocks" on public.portfolio_unlocks
  for select using (viewer_id = auth.uid() or public.is_admin());

create or replace function public.unlock_portfolio(target_portfolio_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  item public.portfolios%rowtype;
  updated_balance integer;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into item from public.portfolios where id = target_portfolio_id for update;
  if item.id is null then raise exception 'portfolio item not found'; end if;
  if item.visibility <> 'paid' then raise exception 'this portfolio item is public'; end if;
  if item.artist_id = auth.uid() or public.is_admin() then
    select point_balance into updated_balance from public.profiles where id = auth.uid();
    return updated_balance;
  end if;
  if exists(select 1 from public.portfolio_unlocks where portfolio_id = item.id and viewer_id = auth.uid()) then
    select point_balance into updated_balance from public.profiles where id = auth.uid();
    return updated_balance;
  end if;
  update public.profiles set point_balance = point_balance - item.access_price, updated_at = now()
  where id = auth.uid() and point_balance >= item.access_price
  returning point_balance into updated_balance;
  if updated_balance is null then raise exception 'insufficient points'; end if;
  insert into public.portfolio_unlocks (portfolio_id, viewer_id, points_paid)
  values (item.id, auth.uid(), item.access_price);
  insert into public.notifications (user_id, type, title, body)
  values (auth.uid(), 'portfolio_unlock', '作品已解锁', '已使用 ' || item.access_price || ' 点解锁付费作品。');
  return updated_balance;
end;
$$;

revoke all on function public.unlock_portfolio(uuid) from public;
grant execute on function public.unlock_portfolio(uuid) to authenticated;

drop function if exists public.publish_shop_product(text, text, public.product_kind, numeric, integer);
create or replace function public.publish_shop_product(
  product_title text,
  product_description text,
  product_kind public.product_kind,
  product_price numeric,
  product_stock integer default null,
  product_cover_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare new_product_id uuid; account_role public.platform_role;
begin
  select role into account_role from public.profiles where id = auth.uid();
  if account_role not in ('artist', 'admin') then raise exception 'seller access required'; end if;
  if length(trim(product_title)) < 3 or length(trim(product_description)) < 10 then raise exception 'product information is incomplete'; end if;
  if product_price <= 0 then raise exception 'product price must be positive'; end if;
  if product_kind = 'physical' and (product_stock is null or product_stock < 0) then raise exception 'physical product stock is required'; end if;
  insert into public.products (seller_id, title, description, kind, price, stock, cover_url)
  values (auth.uid(), trim(product_title), trim(product_description), product_kind, product_price,
    case when product_kind = 'digital' then null else product_stock end, nullif(trim(product_cover_url), ''))
  returning id into new_product_id;
  return new_product_id;
end;
$$;

revoke all on function public.publish_shop_product(text, text, public.product_kind, numeric, integer, text) from public;
grant execute on function public.publish_shop_product(text, text, public.product_kind, numeric, integer, text) to authenticated;
