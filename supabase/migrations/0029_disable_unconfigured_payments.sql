-- No payment processor is configured: no pretend payments, credit purchases, or refunds.

CREATE OR REPLACE FUNCTION public.simulate_commission_deposit(target_order_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  raise exception '收款服务尚未开放，未发生扣款或充值。' using errcode = '55000';
end;
$function$;

CREATE OR REPLACE FUNCTION public.simulate_commission_balance(target_order_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  raise exception '收款服务尚未开放，未发生扣款或充值。' using errcode = '55000';
end;
$function$;

CREATE OR REPLACE FUNCTION public.checkout_shop_cart()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  raise exception '收款服务尚未开放，未发生扣款或充值。' using errcode = '55000';
end;
$function$;

CREATE OR REPLACE FUNCTION public.checkout_shop_cart_with_address(target_address_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  raise exception '收款服务尚未开放，未发生扣款或充值。' using errcode = '55000';
end;
$function$;

CREATE OR REPLACE FUNCTION public.checkout_single_product(target_product_id uuid, target_quantity integer DEFAULT 1, target_address_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  raise exception '收款服务尚未开放，未发生扣款或充值。' using errcode = '55000';
end;
$function$;

CREATE OR REPLACE FUNCTION public.simulate_point_purchase(target_package text)
 RETURNS TABLE(purchase_id uuid, added_points integer, new_balance integer, active_plan text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  raise exception '收款服务尚未开放，未发生扣款或充值。' using errcode = '55000';
end;
$function$;

CREATE OR REPLACE FUNCTION public.unlock_portfolio(target_portfolio_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  raise exception '收款服务尚未开放，未发生扣款或充值。' using errcode = '55000';
end;
$function$;

CREATE OR REPLACE FUNCTION public.advance_shop_order(target_order_id uuid, action text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  order_row public.shop_orders%rowtype;
  is_seller boolean;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if action = 'refund' then raise exception '退款服务尚未开放，未发生实际退款。' using errcode = '55000'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
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
    if auth.uid() is distinct from order_row.buyer_id and not public.is_admin() then raise exception 'buyer access required'; end if;
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
$function$;

CREATE OR REPLACE FUNCTION public.resolve_commission_dispute(target_dispute_id uuid, resolution_action text, resolution_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  dispute_row public.order_disputes%rowtype;
  next_status public.commission_status;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if resolution_action = 'refund' then raise exception '退款服务尚未开放，未发生实际退款。' using errcode = '55000'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  if not public.is_admin() then raise exception 'admin access required'; end if;
  select * into dispute_row from public.order_disputes where id = target_dispute_id;
  if dispute_row.id is null then raise exception 'dispute not found'; end if;
  if dispute_row.status not in ('open', 'reviewing') then raise exception 'dispute already resolved'; end if;
  if length(trim(resolution_note)) < 5 then raise exception 'resolution note is too short'; end if;

  if resolution_action = 'continue' then
    next_status := coalesce(dispute_row.previous_order_status, 'in_progress');
  elsif resolution_action in ('refund', 'close') then
    next_status := 'cancelled';
  else
    raise exception 'invalid resolution action';
  end if;

  update public.order_disputes
  set status = 'resolved', resolution = resolution_action || ': ' || resolution_note,
      resolved_by = auth.uid(), resolved_at = now()
  where id = target_dispute_id;

  update public.commission_orders
  set status = next_status,
      deposit_status = case when resolution_action = 'refund' and deposit_status = 'paid' then 'refunded' else deposit_status end,
      balance_status = case when resolution_action = 'refund' and balance_status = 'paid' then 'refunded' else balance_status end,
      updated_at = now()
  where id = dispute_row.order_id;

  insert into public.order_status_logs (order_id, actor_id, from_status, to_status, note)
  values (dispute_row.order_id, auth.uid(), 'disputed', next_status, resolution_note);
end;
$function$;

notify pgrst, 'reload schema';
