create or replace function public.publish_shop_product(
  product_title text,
  product_description text,
  product_kind public.product_kind,
  product_price numeric,
  product_stock integer default null
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
  insert into public.products (seller_id, title, description, kind, price, stock)
  values (auth.uid(), trim(product_title), trim(product_description), product_kind, product_price,
    case when product_kind = 'digital' then null else product_stock end)
  returning id into new_product_id;
  return new_product_id;
end;
$$;

create or replace function public.advance_shop_order(target_order_id uuid, action text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.shop_orders%rowtype;
  is_seller boolean;
begin
  select * into order_row from public.shop_orders where id = target_order_id for update;
  if order_row.id is null then raise exception 'shop order not found'; end if;
  select exists(
    select 1 from public.shop_order_items i join public.products p on p.id = i.product_id
    where i.order_id = target_order_id and p.seller_id = auth.uid()
  ) into is_seller;

  if action = 'shipped' then
    if not is_seller and not public.is_admin() then raise exception 'seller access required'; end if;
    if order_row.fulfillment_status <> 'processing' then raise exception 'order is not ready to ship'; end if;
    update public.shop_orders set fulfillment_status = 'shipped' where id = target_order_id;
    insert into public.notifications (user_id, type, title, body)
    values (order_row.buyer_id, 'shop_fulfillment', '商品订单已发货', '订单 ' || left(target_order_id::text, 8));
  elsif action = 'delivered' then
    if not is_seller and not public.is_admin() then raise exception 'seller access required'; end if;
    if order_row.fulfillment_status not in ('processing', 'shipped') then raise exception 'order cannot be delivered'; end if;
    update public.shop_orders set fulfillment_status = 'delivered' where id = target_order_id;
    insert into public.notifications (user_id, type, title, body)
    values (order_row.buyer_id, 'shop_fulfillment', '商品已经交付', '请确认订单 ' || left(target_order_id::text, 8));
  elsif action = 'received' then
    if auth.uid() <> order_row.buyer_id and not public.is_admin() then raise exception 'buyer access required'; end if;
    if order_row.fulfillment_status <> 'delivered' then raise exception 'order has not been delivered'; end if;
    update public.shop_orders set fulfillment_status = 'completed' where id = target_order_id;
  elsif action = 'refund' then
    if not public.is_admin() then raise exception 'admin access required'; end if;
    if order_row.payment_status <> 'paid' then raise exception 'only paid orders can be refunded'; end if;
    update public.shop_orders set payment_status = 'refunded', fulfillment_status = 'refunded' where id = target_order_id;
    update public.products p set stock = p.stock + i.quantity
    from public.shop_order_items i where i.order_id = target_order_id and i.product_id = p.id and p.stock is not null;
    insert into public.notifications (user_id, type, title, body)
    values (order_row.buyer_id, 'shop_refund', '商品订单已模拟退款', '订单 ' || left(target_order_id::text, 8) || ' · ¥' || order_row.amount::text);
  else
    raise exception 'invalid shop order action';
  end if;
end;
$$;

revoke all on function public.publish_shop_product(text, text, public.product_kind, numeric, integer) from public;
revoke all on function public.advance_shop_order(uuid, text) from public;
grant execute on function public.publish_shop_product(text, text, public.product_kind, numeric, integer) to authenticated;
grant execute on function public.advance_shop_order(uuid, text) to authenticated;

