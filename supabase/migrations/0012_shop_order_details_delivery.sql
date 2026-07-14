alter table public.shop_orders
  add column if not exists delivery_method text,
  add column if not exists delivery_note text,
  add column if not exists digital_download_url text,
  add column if not exists tracking_company text,
  add column if not exists tracking_number text,
  add column if not exists fulfilled_at timestamptz;

create policy "sellers read relevant order items" on public.shop_order_items for select
using (exists(
  select 1 from public.products p where p.id = product_id and p.seller_id = auth.uid()
) or public.is_admin());

create or replace function public.submit_shop_fulfillment(
  target_order_id uuid,
  fulfillment_method text,
  fulfillment_note text,
  download_url text default null,
  shipping_company text default null,
  shipping_number text default null
)
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
  if not is_seller and not public.is_admin() then raise exception 'seller access required'; end if;
  if order_row.payment_status <> 'paid' or order_row.fulfillment_status <> 'processing' then raise exception 'order is not ready for fulfillment'; end if;
  if length(trim(fulfillment_note)) < 5 then raise exception 'fulfillment note is too short'; end if;

  if fulfillment_method = 'digital' then
    if download_url is null or download_url !~ '^https?://' then raise exception 'valid download url is required'; end if;
    update public.shop_orders set delivery_method = 'digital', delivery_note = trim(fulfillment_note),
      digital_download_url = trim(download_url), fulfillment_status = 'delivered', fulfilled_at = now()
    where id = target_order_id;
    insert into public.notifications (user_id, type, title, body)
    values (order_row.buyer_id, 'shop_fulfillment', '数字商品已经交付', '订单 ' || left(target_order_id::text, 8) || ' 的下载地址已开放');
  elsif fulfillment_method = 'shipping' then
    if length(trim(coalesce(shipping_company, ''))) < 2 or length(trim(coalesce(shipping_number, ''))) < 4 then raise exception 'shipping company and tracking number are required'; end if;
    update public.shop_orders set delivery_method = 'shipping', delivery_note = trim(fulfillment_note),
      tracking_company = trim(shipping_company), tracking_number = trim(shipping_number), fulfillment_status = 'shipped', fulfilled_at = now()
    where id = target_order_id;
    insert into public.notifications (user_id, type, title, body)
    values (order_row.buyer_id, 'shop_fulfillment', '实体商品已经发货', trim(shipping_company) || ' · ' || trim(shipping_number));
  else
    raise exception 'invalid fulfillment method';
  end if;
end;
$$;

revoke all on function public.submit_shop_fulfillment(uuid, text, text, text, text, text) from public;
grant execute on function public.submit_shop_fulfillment(uuid, text, text, text, text, text) to authenticated;

