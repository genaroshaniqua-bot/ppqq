create table if not exists public.user_addresses (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null default '常用地址', recipient_name text not null, phone text not null, region text not null,
  detail text not null, is_default boolean not null default false, created_at timestamptz not null default now()
);
alter table public.user_addresses enable row level security;
create policy "users manage own addresses" on public.user_addresses for all
using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

alter table public.shop_orders add column if not exists shipping_address jsonb, add column if not exists delivery_file_path text;
insert into storage.buckets (id, name, public, file_size_limit) values ('digital-deliveries', 'digital-deliveries', false, 20971520)
on conflict (id) do update set public = false, file_size_limit = 20971520;

create or replace function public.can_access_shop_delivery(object_name text) returns boolean
language plpgsql security definer set search_path = public, storage as $$
declare folders text[]; order_uuid uuid;
begin
  folders := storage.foldername(object_name);
  if array_length(folders, 1) < 2 or folders[2] !~ '^[0-9a-fA-F-]{36}$' then return false; end if;
  order_uuid := folders[2]::uuid;
  return exists(select 1 from public.shop_orders o join public.shop_order_items i on i.order_id = o.id join public.products p on p.id = i.product_id
    where o.id = order_uuid and (o.buyer_id = auth.uid() or p.seller_id = auth.uid() or public.is_admin()));
end; $$;

create policy "order parties read digital deliveries" on storage.objects for select
using (bucket_id = 'digital-deliveries' and public.can_access_shop_delivery(name));
create policy "sellers upload digital deliveries" on storage.objects for insert
with check (bucket_id = 'digital-deliveries' and (storage.foldername(name))[1] = auth.uid()::text and public.can_access_shop_delivery(name));

create or replace function public.checkout_shop_cart_with_address(target_address_id uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare new_order_id uuid; total_amount numeric(12,2); invalid_count integer; needs_address boolean; address_row public.user_addresses%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  perform 1 from public.products p join public.cart_items c on c.product_id = p.id where c.user_id = auth.uid() for update of p;
  select count(*) into invalid_count from public.cart_items c join public.products p on p.id = c.product_id where c.user_id = auth.uid() and (not p.is_active or (p.stock is not null and p.stock < c.quantity));
  if invalid_count > 0 then raise exception 'cart contains unavailable or insufficient stock products'; end if;
  select sum(p.price * c.quantity), bool_or(p.kind = 'physical') into total_amount, needs_address from public.cart_items c join public.products p on p.id = c.product_id where c.user_id = auth.uid();
  if total_amount is null then raise exception 'cart is empty'; end if;
  if needs_address then select * into address_row from public.user_addresses where id = target_address_id and user_id = auth.uid(); if address_row.id is null then raise exception 'shipping address is required'; end if; end if;
  insert into public.shop_orders (buyer_id, amount, payment_status, fulfillment_status, shipping_address)
  values (auth.uid(), total_amount, 'paid', 'processing', case when needs_address then jsonb_build_object('label', address_row.label, 'recipient_name', address_row.recipient_name, 'phone', address_row.phone, 'region', address_row.region, 'detail', address_row.detail) else null end)
  returning id into new_order_id;
  insert into public.shop_order_items (order_id, product_id, quantity, unit_price) select new_order_id, p.id, c.quantity, p.price from public.cart_items c join public.products p on p.id = c.product_id where c.user_id = auth.uid();
  update public.products p set stock = p.stock - c.quantity from public.cart_items c where c.user_id = auth.uid() and c.product_id = p.id and p.stock is not null;
  delete from public.cart_items where user_id = auth.uid();
  insert into public.notifications (user_id, type, title, body) values (auth.uid(), 'shop_order', '商品订单模拟支付成功', '订单 ' || left(new_order_id::text, 8) || ' · ¥' || total_amount::text);
  return new_order_id;
end; $$;

create or replace function public.attach_shop_delivery_file(target_order_id uuid, object_path text, fulfillment_note text) returns void
language plpgsql security definer set search_path = public as $$
declare order_row public.shop_orders%rowtype; is_seller boolean;
begin
  select * into order_row from public.shop_orders where id = target_order_id for update;
  if order_row.id is null then raise exception 'shop order not found'; end if;
  select exists(select 1 from public.shop_order_items i join public.products p on p.id = i.product_id where i.order_id = target_order_id and p.seller_id = auth.uid()) into is_seller;
  if not is_seller and not public.is_admin() then raise exception 'seller access required'; end if;
  if order_row.payment_status <> 'paid' or order_row.fulfillment_status <> 'processing' then raise exception 'order is not ready for fulfillment'; end if;
  if (object_path not like auth.uid()::text || '/' || target_order_id::text || '/%') and not public.is_admin() then raise exception 'invalid delivery file path'; end if;
  if not exists(select 1 from storage.objects where bucket_id = 'digital-deliveries' and name = object_path) then raise exception 'delivery file not found'; end if;
  update public.shop_orders set delivery_method = 'private_file', delivery_file_path = object_path, delivery_note = trim(fulfillment_note), fulfillment_status = 'delivered', fulfilled_at = now() where id = target_order_id;
  insert into public.notifications (user_id, type, title, body) values (order_row.buyer_id, 'shop_fulfillment', '数字文件已经安全交付', '订单 ' || left(target_order_id::text, 8) || ' 可生成限时下载链接');
end; $$;

revoke all on function public.can_access_shop_delivery(text) from public;
revoke all on function public.checkout_shop_cart_with_address(uuid) from public;
revoke all on function public.attach_shop_delivery_file(uuid, text, text) from public;
grant execute on function public.can_access_shop_delivery(text) to authenticated;
grant execute on function public.checkout_shop_cart_with_address(uuid) to authenticated;
grant execute on function public.attach_shop_delivery_file(uuid, text, text) to authenticated;

