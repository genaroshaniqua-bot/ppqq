create table if not exists public.service_packages (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.artist_services(id) on delete cascade,
  tier text not null check (tier in ('basic', 'standard', 'premium')),
  title text not null,
  description text not null default '',
  price numeric(12, 2) not null check (price >= 0),
  delivery_days integer not null check (delivery_days > 0),
  revision_limit integer not null default 2 check (revision_limit >= 0),
  features text[] not null default '{}',
  is_active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(service_id, tier)
);

alter table public.service_packages enable row level security;

create policy "active service packages are readable"
on public.service_packages for select
using (
  is_active
  or exists (
    select 1 from public.artist_services service
    where service.id = service_packages.service_id and service.artist_id = auth.uid()
  )
  or public.is_admin()
);

create policy "artists manage own service packages"
on public.service_packages for all
using (
  exists (
    select 1 from public.artist_services service
    where service.id = service_packages.service_id and service.artist_id = auth.uid()
  )
  or public.is_admin()
)
with check (
  exists (
    select 1 from public.artist_services service
    where service.id = service_packages.service_id and service.artist_id = auth.uid()
  )
  or public.is_admin()
);

insert into public.service_packages (
  service_id, tier, title, description, price, delivery_days, revision_limit, features, position
)
select
  service.id,
  'basic',
  '基础方案',
  '包含服务说明中的基础交付内容',
  service.base_price,
  service.delivery_days,
  service.revision_limit,
  array['基础交付', format('含 %s 次修改', service.revision_limit)],
  0
from public.artist_services service
on conflict (service_id, tier) do nothing;

alter table public.commission_requests
  add column if not exists package_id uuid references public.service_packages(id) on delete set null,
  add column if not exists package_snapshot jsonb;

alter table public.commission_orders
  add column if not exists package_snapshot jsonb;

create table if not exists public.artist_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.commission_orders(id) on delete cascade,
  artist_id uuid not null references public.artist_profiles(user_id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  communication_rating integer not null check (communication_rating between 1 and 5),
  quality_rating integer not null check (quality_rating between 1 and 5),
  body text not null check (char_length(body) between 10 and 500),
  created_at timestamptz not null default now()
);

alter table public.artist_reviews enable row level security;

create policy "artist reviews are publicly readable"
on public.artist_reviews for select
using (true);

create or replace function public.submit_artist_review(
  target_order_id uuid,
  rating_value integer,
  communication_value integer,
  quality_value integer,
  review_body text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.commission_orders%rowtype;
  review_id uuid;
begin
  select * into order_row from public.commission_orders where id = target_order_id;
  if order_row.id is null then raise exception 'commission order not found'; end if;
  if auth.uid() <> order_row.client_id then raise exception 'client access required'; end if;
  if order_row.status <> 'completed' then raise exception 'completed order required'; end if;
  if rating_value not between 1 and 5 or communication_value not between 1 and 5 or quality_value not between 1 and 5 then
    raise exception 'ratings must be between 1 and 5';
  end if;
  if char_length(trim(review_body)) not between 10 and 500 then raise exception 'review must contain 10 to 500 characters'; end if;

  insert into public.artist_reviews (
    order_id, artist_id, client_id, rating, communication_rating, quality_rating, body
  ) values (
    order_row.id, order_row.artist_id, order_row.client_id,
    rating_value, communication_value, quality_value, trim(review_body)
  )
  returning id into review_id;
  return review_id;
end;
$$;

create or replace function public.confirm_commission_quote(target_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.commission_requests%rowtype;
  service_row public.artist_services%rowtype;
  package_row public.service_packages%rowtype;
  package_data jsonb;
  selected_revision_limit integer;
  new_order_id uuid;
begin
  select * into request_row from public.commission_requests where id = target_request_id;
  if request_row.id is null then raise exception 'commission request not found'; end if;
  if auth.uid() <> request_row.client_id and not public.is_admin() then raise exception 'client access required'; end if;
  if request_row.status <> 'quoted' or request_row.quoted_amount is null then raise exception 'request is not ready for confirmation'; end if;

  select * into service_row from public.artist_services where id = request_row.service_id;
  if request_row.package_id is not null then
    select * into package_row from public.service_packages where id = request_row.package_id and service_id = service_row.id;
  end if;
  package_data := coalesce(
    request_row.package_snapshot,
    case when package_row.id is not null then jsonb_build_object(
      'id', package_row.id,
      'tier', package_row.tier,
      'title', package_row.title,
      'price', package_row.price,
      'delivery_days', package_row.delivery_days,
      'revision_limit', package_row.revision_limit,
      'features', package_row.features
    ) else null end
  );
  selected_revision_limit := coalesce(package_row.revision_limit, service_row.revision_limit);

  insert into public.commission_orders (
    request_id, client_id, artist_id, status, quoted_amount,
    deposit_amount, balance_amount, revision_limit, package_snapshot
  ) values (
    request_row.id, request_row.client_id, service_row.artist_id, 'pending_deposit', request_row.quoted_amount,
    round(request_row.quoted_amount * 0.3, 2), round(request_row.quoted_amount * 0.7, 2), selected_revision_limit, package_data
  )
  returning id into new_order_id;

  update public.commission_requests set status = 'confirmed' where id = target_request_id;
  insert into public.order_status_logs (order_id, actor_id, from_status, to_status, note)
  values (new_order_id, auth.uid(), null, 'pending_deposit', '委托人已确认报价');
  return new_order_id;
end;
$$;

create or replace function public.checkout_single_product(
  target_product_id uuid,
  target_quantity integer default 1,
  target_address_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  product_row public.products%rowtype;
  address_row public.user_addresses%rowtype;
  address_snapshot jsonb;
  new_order_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if target_quantity < 1 or target_quantity > 20 then raise exception 'quantity must be between 1 and 20'; end if;

  select * into product_row from public.products where id = target_product_id for update;
  if product_row.id is null or not product_row.is_active then raise exception 'product unavailable'; end if;
  if product_row.stock is not null and product_row.stock < target_quantity then raise exception 'insufficient stock'; end if;

  if product_row.kind = 'physical' then
    select * into address_row from public.user_addresses where id = target_address_id and user_id = auth.uid();
    if address_row.id is null then raise exception 'shipping address required'; end if;
    address_snapshot := jsonb_build_object(
      'label', address_row.label,
      'recipient_name', address_row.recipient_name,
      'phone', address_row.phone,
      'region', address_row.region,
      'detail', address_row.detail
    );
  end if;

  insert into public.shop_orders (buyer_id, amount, payment_status, fulfillment_status, shipping_address)
  values (auth.uid(), product_row.price * target_quantity, 'paid', 'processing', address_snapshot)
  returning id into new_order_id;

  insert into public.shop_order_items (order_id, product_id, quantity, unit_price)
  values (new_order_id, product_row.id, target_quantity, product_row.price);

  if product_row.stock is not null then
    update public.products set stock = stock - target_quantity where id = product_row.id;
  end if;
  return new_order_id;
end;
$$;

revoke all on function public.submit_artist_review(uuid, integer, integer, integer, text) from public;
revoke all on function public.checkout_single_product(uuid, integer, uuid) from public;
grant execute on function public.submit_artist_review(uuid, integer, integer, integer, text) to authenticated;
grant execute on function public.checkout_single_product(uuid, integer, uuid) to authenticated;
