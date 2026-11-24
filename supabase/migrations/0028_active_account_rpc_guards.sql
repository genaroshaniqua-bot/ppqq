-- Active-account checks apply to direct table access and privileged RPCs.
create or replace function public.is_active_account()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and account_status = 'active'); $$;
revoke all on function public.is_active_account() from public, anon;
grant execute on function public.is_active_account() to authenticated;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin' and account_status = 'active'); $$;

CREATE OR REPLACE FUNCTION public.mark_notification_read(target_notification_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  update public.notifications set read_at = now()
  where public.is_active_account() and id = target_notification_id and user_id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  update public.notifications set read_at = now()
  where public.is_active_account() and user_id = auth.uid() and read_at is null;
$function$;

CREATE OR REPLACE FUNCTION public.artist_respond_to_commission(target_request_id uuid, decision text, quote_amount numeric DEFAULT NULL::numeric, response_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  request_artist_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  select service.artist_id into request_artist_id
  from public.commission_requests request
  join public.artist_services service on service.id = request.service_id
  where request.id = target_request_id;

  if request_artist_id is null then raise exception 'commission request not found'; end if;
  if auth.uid() is distinct from request_artist_id and not public.is_admin() then raise exception 'artist access required'; end if;

  if decision = 'rejected' then
    update public.commission_requests
    set status = 'rejected', artist_response_note = response_note, quoted_amount = null
    where id = target_request_id and status = 'pending_artist';
  elsif decision = 'quoted' then
    if quote_amount is null or quote_amount <= 0 then raise exception 'valid quote amount required'; end if;
    update public.commission_requests
    set status = 'quoted', artist_response_note = response_note, quoted_amount = quote_amount
    where id = target_request_id and status in ('pending_artist', 'quoted');
  else
    raise exception 'invalid decision';
  end if;

  if not found then raise exception 'request cannot be updated in its current state'; end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.simulate_commission_deposit(target_order_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  order_client_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  select client_id into order_client_id from public.commission_orders where id = target_order_id;
  if order_client_id is null then raise exception 'commission order not found'; end if;
  if auth.uid() is distinct from order_client_id and not public.is_admin() then raise exception 'client access required'; end if;

  update public.commission_orders
  set deposit_status = 'paid', status = 'in_progress', updated_at = now()
  where id = target_order_id and status = 'pending_deposit' and deposit_status = 'unpaid';
  if not found then raise exception 'deposit cannot be paid in the current state'; end if;

  insert into public.order_status_logs (order_id, actor_id, from_status, to_status, note)
  values (target_order_id, auth.uid(), 'pending_deposit', 'in_progress', '模拟定金支付成功');
end;
$function$;

CREATE OR REPLACE FUNCTION public.confirm_commission_quote(target_request_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  request_row public.commission_requests%rowtype;
  service_row public.artist_services%rowtype;
  package_row public.service_packages%rowtype;
  package_data jsonb;
  selected_revision_limit integer;
  new_order_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  select * into request_row from public.commission_requests where id = target_request_id;
  if request_row.id is null then raise exception 'commission request not found'; end if;
  if auth.uid() is distinct from request_row.client_id and not public.is_admin() then raise exception 'client access required'; end if;
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
$function$;

CREATE OR REPLACE FUNCTION public.submit_commission_delivery(target_order_id uuid, delivery_kind text, delivery_note text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  order_row public.commission_orders%rowtype;
  delivery_id uuid;
  next_status public.commission_status;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  select * into order_row from public.commission_orders where id = target_order_id;
  if order_row.id is null then raise exception 'commission order not found'; end if;
  if auth.uid() is distinct from order_row.artist_id and not public.is_admin() then raise exception 'artist access required'; end if;

  if delivery_kind = 'draft' then
    if order_row.status not in ('in_progress', 'revision_requested') then raise exception 'draft cannot be submitted in current state'; end if;
    next_status := 'draft_review';
  elsif delivery_kind = 'final' then
    if order_row.status <> 'in_progress' then raise exception 'final cannot be submitted in current state'; end if;
    if not exists (
      select 1 from public.order_deliveries
      where order_id = target_order_id and kind = 'draft' and decision = 'approved'
    ) then raise exception 'approved draft required before final delivery'; end if;
    next_status := 'final_review';
  else
    raise exception 'invalid delivery kind';
  end if;

  insert into public.order_deliveries (order_id, submitted_by, kind, note)
  values (target_order_id, auth.uid(), delivery_kind, delivery_note)
  returning id into delivery_id;

  update public.commission_orders set status = next_status, updated_at = now() where id = target_order_id;
  insert into public.order_status_logs (order_id, actor_id, from_status, to_status, note)
  values (target_order_id, auth.uid(), order_row.status, next_status, case when delivery_kind = 'draft' then '画师提交草稿' else '画师提交成稿' end);
  return delivery_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.review_commission_delivery(target_delivery_id uuid, review_decision text, review_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  delivery_row public.order_deliveries%rowtype;
  order_row public.commission_orders%rowtype;
  next_status public.commission_status;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  select * into delivery_row from public.order_deliveries where id = target_delivery_id;
  if delivery_row.id is null then raise exception 'delivery not found'; end if;
  select * into order_row from public.commission_orders where id = delivery_row.order_id;
  if auth.uid() is distinct from order_row.client_id and not public.is_admin() then raise exception 'client access required'; end if;
  if delivery_row.decision is not null then raise exception 'delivery already reviewed'; end if;

  if delivery_row.kind = 'draft' and order_row.status <> 'draft_review' then raise exception 'order is not waiting for draft review'; end if;
  if delivery_row.kind = 'final' and order_row.status <> 'final_review' then raise exception 'order is not waiting for final review'; end if;

  if review_decision = 'approved' then
    next_status := case when delivery_row.kind = 'draft' then 'in_progress' else 'pending_balance' end;
  elsif review_decision = 'revision_requested' then
    if order_row.revision_used >= order_row.revision_limit then raise exception 'revision limit reached'; end if;
    next_status := 'revision_requested';
  else
    raise exception 'invalid review decision';
  end if;

  update public.order_deliveries
  set decision = review_decision,
      decision_note = review_note,
      decided_by = auth.uid(),
      decided_at = now()
  where id = target_delivery_id;

  update public.commission_orders
  set status = next_status,
      revision_used = revision_used + case when review_decision = 'revision_requested' then 1 else 0 end,
      updated_at = now()
  where id = order_row.id;

  insert into public.order_status_logs (order_id, actor_id, from_status, to_status, note)
  values (order_row.id, auth.uid(), order_row.status, next_status, review_note);
end;
$function$;

CREATE OR REPLACE FUNCTION public.simulate_commission_balance(target_order_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  order_row public.commission_orders%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  select * into order_row from public.commission_orders where id = target_order_id;
  if order_row.id is null then raise exception 'commission order not found'; end if;
  if auth.uid() is distinct from order_row.client_id and not public.is_admin() then raise exception 'client access required'; end if;

  update public.commission_orders
  set balance_status = 'paid', status = 'completed', updated_at = now()
  where id = target_order_id and status = 'pending_balance' and balance_status = 'unpaid';
  if not found then raise exception 'balance cannot be paid in current state'; end if;

  insert into public.order_status_logs (order_id, actor_id, from_status, to_status, note)
  values (target_order_id, auth.uid(), 'pending_balance', 'completed', '模拟尾款支付成功，订单完成');
end;
$function$;

CREATE OR REPLACE FUNCTION public.open_commission_dispute(target_order_id uuid, dispute_reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  order_row public.commission_orders%rowtype;
  dispute_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  select * into order_row from public.commission_orders where id = target_order_id;
  if order_row.id is null then raise exception 'commission order not found'; end if;
  if auth.uid() not in (order_row.client_id, order_row.artist_id) and not public.is_admin() then raise exception 'order party access required'; end if;
  if order_row.status in ('cancelled', 'disputed') then raise exception 'order cannot enter dispute in current state'; end if;
  if length(trim(dispute_reason)) < 10 then raise exception 'dispute reason is too short'; end if;
  if exists (select 1 from public.order_disputes where order_id = target_order_id and status in ('open', 'reviewing')) then raise exception 'an active dispute already exists'; end if;

  insert into public.order_disputes (order_id, opened_by, reason, status, previous_order_status)
  values (target_order_id, auth.uid(), dispute_reason, 'open', order_row.status)
  returning id into dispute_id;

  update public.commission_orders set status = 'disputed', updated_at = now() where id = target_order_id;
  insert into public.order_status_logs (order_id, actor_id, from_status, to_status, note)
  values (target_order_id, auth.uid(), order_row.status, 'disputed', dispute_reason);
  return dispute_id;
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

CREATE OR REPLACE FUNCTION public.ensure_order_conversation(target_order_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  order_row public.commission_orders%rowtype;
  existing_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  select * into order_row from public.commission_orders where id = target_order_id;
  if order_row.id is null then raise exception 'commission order not found'; end if;
  if auth.uid() not in (order_row.client_id, order_row.artist_id) and not public.is_admin() then raise exception 'order party access required'; end if;

  select conversation_id into existing_id from public.order_conversations where order_id = target_order_id;
  if existing_id is null then
    insert into public.conversations default values returning id into existing_id;
    insert into public.order_conversations (order_id, conversation_id) values (target_order_id, existing_id);
    insert into public.conversation_members (conversation_id, user_id)
    values (existing_id, order_row.client_id), (existing_id, order_row.artist_id)
    on conflict do nothing;
  end if;
  return existing_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.send_order_message(target_order_id uuid, message_body text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  order_row public.commission_orders%rowtype;
  conversation_uuid uuid;
  message_uuid uuid;
  recipient_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  select * into order_row from public.commission_orders where id = target_order_id;
  if order_row.id is null then raise exception 'commission order not found'; end if;
  if auth.uid() not in (order_row.client_id, order_row.artist_id) then raise exception 'order party access required'; end if;
  if length(trim(message_body)) < 1 or length(trim(message_body)) > 2000 then raise exception 'message length must be between 1 and 2000'; end if;

  conversation_uuid := public.ensure_order_conversation(target_order_id);
  insert into public.messages (conversation_id, sender_id, body)
  values (conversation_uuid, auth.uid(), trim(message_body)) returning id into message_uuid;

  recipient_id := case when auth.uid() = order_row.client_id then order_row.artist_id else order_row.client_id end;
  insert into public.notifications (user_id, type, title, body, related_order_id)
  values (recipient_id, 'commission_message', '约稿订单有新消息', left(trim(message_body), 120), target_order_id);
  return message_uuid;
end;
$function$;

CREATE OR REPLACE FUNCTION public.mark_order_notifications_read(target_order_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  update public.notifications
  set read_at = now()
  where public.is_active_account() and user_id = auth.uid() and related_order_id = target_order_id and read_at is null;
$function$;

CREATE OR REPLACE FUNCTION public.set_cart_quantity(target_product_id uuid, target_quantity integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare product_row public.products%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into product_row from public.products where id = target_product_id and is_active = true;
  if product_row.id is null then raise exception 'product is unavailable'; end if;
  if target_quantity <= 0 then
    delete from public.cart_items where user_id = auth.uid() and product_id = target_product_id;
    return;
  end if;
  if target_quantity > 99 or (product_row.stock is not null and target_quantity > product_row.stock) then raise exception 'insufficient stock'; end if;
  insert into public.cart_items (user_id, product_id, quantity)
  values (auth.uid(), target_product_id, target_quantity)
  on conflict (user_id, product_id) do update set quantity = excluded.quantity, updated_at = now();
end;
$function$;

CREATE OR REPLACE FUNCTION public.checkout_shop_cart()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  new_order_id uuid;
  total_amount numeric(12,2);
  invalid_count integer;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  if auth.uid() is null then raise exception 'authentication required'; end if;
  perform 1 from public.products p join public.cart_items c on c.product_id = p.id
  where c.user_id = auth.uid() for update of p;
  select count(*) into invalid_count from public.cart_items c join public.products p on p.id = c.product_id
  where c.user_id = auth.uid() and (not p.is_active or (p.stock is not null and p.stock < c.quantity));
  if invalid_count > 0 then raise exception 'cart contains unavailable or insufficient stock products'; end if;
  select sum(p.price * c.quantity) into total_amount from public.cart_items c join public.products p on p.id = c.product_id where c.user_id = auth.uid();
  if total_amount is null then raise exception 'cart is empty'; end if;

  insert into public.shop_orders (buyer_id, amount, payment_status, fulfillment_status)
  values (auth.uid(), total_amount, 'paid', 'processing') returning id into new_order_id;
  insert into public.shop_order_items (order_id, product_id, quantity, unit_price)
  select new_order_id, p.id, c.quantity, p.price from public.cart_items c join public.products p on p.id = c.product_id where c.user_id = auth.uid();
  update public.products p set stock = p.stock - c.quantity
  from public.cart_items c where c.user_id = auth.uid() and c.product_id = p.id and p.stock is not null;
  delete from public.cart_items where user_id = auth.uid();
  insert into public.notifications (user_id, type, title, body)
  values (auth.uid(), 'shop_order', '商品订单模拟支付成功', '订单 ' || left(new_order_id::text, 8) || ' · ¥' || total_amount::text);
  return new_order_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_moderate_product(target_product_id uuid, next_active boolean, moderation_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  previous_active boolean;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  if not public.is_admin() then raise exception 'admin access required'; end if;
  if length(trim(moderation_reason)) < 4 then raise exception 'moderation reason is required'; end if;

  select is_active into previous_active from public.products where id = target_product_id for update;
  if previous_active is null then raise exception 'product not found'; end if;

  update public.products set is_active = next_active where id = target_product_id;
  insert into public.platform_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (
    auth.uid(),
    'admin_moderate_product',
    'product',
    target_product_id::text,
    jsonb_build_object('previous_active', previous_active, 'next_active', next_active, 'reason', trim(moderation_reason))
  );
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

CREATE OR REPLACE FUNCTION public.submit_shop_fulfillment(target_order_id uuid, fulfillment_method text, fulfillment_note text, download_url text DEFAULT NULL::text, shipping_company text DEFAULT NULL::text, shipping_number text DEFAULT NULL::text)
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
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
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
$function$;

CREATE OR REPLACE FUNCTION public.can_access_shop_delivery(object_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'storage'
AS $function$
declare folders text[]; order_uuid uuid;
begin
  if auth.uid() is null or not exists(select 1 from public.profiles where id = auth.uid() and account_status = 'active') then return false; end if;
  folders := storage.foldername(object_name);
  if array_length(folders, 1) < 2 or folders[2] !~ '^[0-9a-fA-F-]{36}$' then return false; end if;
  order_uuid := folders[2]::uuid;
  return exists(select 1 from public.shop_orders o join public.shop_order_items i on i.order_id = o.id join public.products p on p.id = i.product_id
    where o.id = order_uuid and (o.buyer_id = auth.uid() or p.seller_id = auth.uid() or public.is_admin()));
end; $function$;

CREATE OR REPLACE FUNCTION public.withdraw_legal_consent(target_document_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  update public.legal_consents
  set withdrawn_at = now()
  where user_id = auth.uid() and document_id = target_document_id and withdrawn_at is null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.checkout_shop_cart_with_address(target_address_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare new_order_id uuid; total_amount numeric(12,2); invalid_count integer; needs_address boolean; address_row public.user_addresses%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
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
end; $function$;

CREATE OR REPLACE FUNCTION public.attach_shop_delivery_file(target_order_id uuid, object_path text, fulfillment_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare order_row public.shop_orders%rowtype; is_seller boolean;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  select * into order_row from public.shop_orders where id = target_order_id for update;
  if order_row.id is null then raise exception 'shop order not found'; end if;
  select exists(select 1 from public.shop_order_items i join public.products p on p.id = i.product_id where i.order_id = target_order_id and p.seller_id = auth.uid()) into is_seller;
  if not is_seller and not public.is_admin() then raise exception 'seller access required'; end if;
  if order_row.payment_status <> 'paid' or order_row.fulfillment_status <> 'processing' then raise exception 'order is not ready for fulfillment'; end if;
  if (object_path not like auth.uid()::text || '/' || target_order_id::text || '/%') and not public.is_admin() then raise exception 'invalid delivery file path'; end if;
  if not exists(select 1 from storage.objects where bucket_id = 'digital-deliveries' and name = object_path) then raise exception 'delivery file not found'; end if;
  update public.shop_orders set delivery_method = 'private_file', delivery_file_path = object_path, delivery_note = trim(fulfillment_note), fulfillment_status = 'delivered', fulfilled_at = now() where id = target_order_id;
  insert into public.notifications (user_id, type, title, body) values (order_row.buyer_id, 'shop_fulfillment', '数字文件已经安全交付', '订单 ' || left(target_order_id::text, 8) || ' 可生成限时下载链接');
end; $function$;

CREATE OR REPLACE FUNCTION public.admin_manage_user(target_user_id uuid, next_role platform_role, next_status text, change_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  previous_profile public.profiles%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  if not public.is_admin() then raise exception 'admin access required'; end if;
  if target_user_id = auth.uid() then raise exception 'cannot change your own administrator account'; end if;
  if next_status not in ('active', 'suspended') then raise exception 'invalid account status'; end if;
  if length(trim(change_reason)) < 4 then raise exception 'change reason is required'; end if;

  select * into previous_profile from public.profiles where id = target_user_id for update;
  if previous_profile.id is null then raise exception 'user not found'; end if;

  update public.profiles
  set role = next_role, account_status = next_status, updated_at = now()
  where id = target_user_id;

  insert into public.platform_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (
    auth.uid(),
    'admin_manage_user',
    'profile',
    target_user_id::text,
    jsonb_build_object(
      'previous_role', previous_profile.role,
      'next_role', next_role,
      'previous_status', previous_profile.account_status,
      'next_status', next_status,
      'reason', trim(change_reason)
    )
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.can_read_shop_order(target_order_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.shop_orders shop_order
    where shop_order.id = target_order_id
      and exists(select 1 from public.profiles where id = auth.uid() and account_status = 'active')
      and (
        shop_order.buyer_id = auth.uid()
        or public.is_admin()
        or exists (
          select 1
          from public.shop_order_items item
          join public.products product on product.id = item.product_id
          where item.order_id = shop_order.id
            and product.seller_id = auth.uid()
        )
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.admin_moderate_service(target_service_id uuid, next_active boolean, moderation_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  previous_active boolean;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
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
$function$;

CREATE OR REPLACE FUNCTION public.submit_artist_review(target_order_id uuid, rating_value integer, communication_value integer, quality_value integer, review_body text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  order_row public.commission_orders%rowtype;
  review_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  select * into order_row from public.commission_orders where id = target_order_id;
  if order_row.id is null then raise exception 'commission order not found'; end if;
  if auth.uid() is distinct from order_row.client_id then raise exception 'client access required'; end if;
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
$function$;

CREATE OR REPLACE FUNCTION public.checkout_single_product(target_product_id uuid, target_quantity integer DEFAULT 1, target_address_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  product_row public.products%rowtype;
  address_row public.user_addresses%rowtype;
  address_snapshot jsonb;
  new_order_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
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
$function$;

CREATE OR REPLACE FUNCTION public.simulate_point_purchase(target_package text)
 RETURNS TABLE(purchase_id uuid, added_points integer, new_balance integer, active_plan text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  package_points integer;
  package_amount numeric(12, 2);
  package_plan text;
  next_expiry timestamptz;
  created_purchase uuid;
  updated_balance integer;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  if auth.uid() is null then raise exception 'authentication required'; end if;

  case target_package
    when 'basic_monthly' then
      package_points := 800; package_amount := 29; package_plan := 'basic';
    when 'premium_monthly' then
      package_points := 2400; package_amount := 69; package_plan := 'premium';
    when 'project_pack' then
      package_points := 300; package_amount := 12; package_plan := null;
    else raise exception 'unknown point package';
  end case;

  if package_plan is not null then
    select greatest(coalesce(membership_expires_at, now()), now()) + interval '30 days'
      into next_expiry from public.profiles where id = auth.uid();
  end if;

  update public.profiles
  set point_balance = point_balance + package_points,
      membership_plan = coalesce(package_plan, membership_plan),
      membership_expires_at = coalesce(next_expiry, membership_expires_at),
      updated_at = now()
  where id = auth.uid()
  returning point_balance into updated_balance;

  if not found then raise exception 'profile not found'; end if;

  insert into public.point_purchases (user_id, package_code, points, amount)
  values (auth.uid(), target_package, package_points, package_amount)
  returning id into created_purchase;

  insert into public.notifications (user_id, type, title, body)
  values (auth.uid(), 'point_purchase', '点数充值成功', '模拟支付已完成，' || package_points || ' 点已加入账户。');

  return query select created_purchase, package_points, updated_balance,
    coalesce(package_plan, (select membership_plan from public.profiles where id = auth.uid())),
    (select membership_expires_at from public.profiles where id = auth.uid());
end;
$function$;

CREATE OR REPLACE FUNCTION public.publish_public_commission(request_title text, request_brief text, request_service_type text, request_budget_min numeric, request_budget_max numeric, request_deadline date, request_usage_scope text, request_collection_days integer, request_allow_public_display boolean DEFAULT false, request_allow_ai_training boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  new_request_id uuid;
  next_moderation text;
  risk_reason text;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if char_length(trim(request_title)) < 4 or char_length(trim(request_brief)) < 20 then raise exception 'request details are incomplete'; end if;
  if request_budget_min <= 0 or request_budget_max < request_budget_min then raise exception 'invalid budget range'; end if;
  if request_collection_days not in (3, 7, 14) then raise exception 'collection days must be 3, 7 or 14'; end if;
  if request_usage_scope not in ('personal', 'commercial', 'buyout') then raise exception 'invalid usage scope'; end if;

  if request_budget_max >= 3000 then risk_reason := '预算达到 ¥3000 高金额审核线'; end if;
  if request_usage_scope in ('commercial', 'buyout') then
    risk_reason := concat_ws('；', risk_reason, case when request_usage_scope = 'buyout' then '版权买断需人工审核' else '商业授权需人工审核' end);
  end if;
  if lower(request_title || ' ' || request_brief) ~ '(未成年.*色情|盗号|代充|仇恨|暴力威胁)' then
    risk_reason := concat_ws('；', risk_reason, '敏感内容命中');
  end if;
  next_moderation := case when risk_reason is null then 'auto_approved' else 'pending_review' end;

  insert into public.commission_requests (
    client_id, title, brief, service_type, budget_min, budget_max, deadline,
    usage_scope, allow_public_display, allow_ai_training, request_mode, status,
    moderation_status, moderation_reason, collection_days, collection_ends_at
  ) values (
    auth.uid(), trim(request_title), trim(request_brief), request_service_type,
    request_budget_min, request_budget_max, request_deadline, request_usage_scope,
    request_allow_public_display, request_allow_ai_training, 'public', 'pending_artist',
    next_moderation, risk_reason, request_collection_days, now() + make_interval(days => request_collection_days)
  ) returning id into new_request_id;

  return new_request_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.submit_public_commission_response(target_request_id uuid, target_service_id uuid, target_package_id uuid, response_quote numeric, response_delivery_days integer, response_note text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  request_row public.commission_requests%rowtype;
  service_row public.artist_services%rowtype;
  package_row public.service_packages%rowtype;
  response_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  select * into request_row from public.commission_requests where id = target_request_id;
  if request_row.id is null or request_row.request_mode <> 'public' then raise exception 'public request not found'; end if;
  if request_row.moderation_status not in ('auto_approved', 'approved') or request_row.collection_ends_at <= now() or request_row.status not in ('pending_artist', 'quoted') then raise exception 'request is not accepting responses'; end if;

  select * into service_row from public.artist_services where id = target_service_id and artist_id = auth.uid() and is_active;
  if service_row.id is null then raise exception 'active owned service required'; end if;
  if not exists (select 1 from public.artist_profiles where user_id = auth.uid() and review_status = 'approved' and availability = 'open') then raise exception 'approved available artist required'; end if;
  select * into package_row from public.service_packages where id = target_package_id and service_id = service_row.id and is_active;
  if package_row.id is null then raise exception 'active package required'; end if;
  if response_quote <= 0 or response_delivery_days <= 0 or char_length(trim(response_note)) < 10 then raise exception 'response details are incomplete'; end if;

  insert into public.commission_responses (
    request_id, artist_id, service_id, package_id, quote_amount, delivery_days,
    revision_limit, proposal_note, status, valid_until
  ) values (
    request_row.id, auth.uid(), service_row.id, package_row.id, response_quote,
    response_delivery_days, package_row.revision_limit, trim(response_note), 'submitted', now() + interval '72 hours'
  )
  on conflict (request_id, artist_id) do update set
    service_id = excluded.service_id, package_id = excluded.package_id,
    quote_amount = excluded.quote_amount, delivery_days = excluded.delivery_days,
    revision_limit = excluded.revision_limit, proposal_note = excluded.proposal_note,
    status = 'submitted', valid_until = now() + interval '72 hours', updated_at = now()
  returning id into response_id;
  return response_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.select_public_commission_response(target_response_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  response_row public.commission_responses%rowtype;
  request_row public.commission_requests%rowtype;
  package_row public.service_packages%rowtype;
  new_order_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  select * into response_row from public.commission_responses where id = target_response_id for update;
  if response_row.id is null or response_row.status <> 'submitted' or response_row.valid_until <= now() then raise exception 'response is not selectable'; end if;
  select * into request_row from public.commission_requests where id = response_row.request_id for update;
  if auth.uid() is distinct from request_row.client_id then raise exception 'client access required'; end if;
  if request_row.selected_response_id is not null or request_row.status = 'confirmed' then raise exception 'artist already selected'; end if;
  select * into package_row from public.service_packages where id = response_row.package_id;

  insert into public.commission_orders (
    request_id, client_id, artist_id, status, quoted_amount, deposit_amount,
    balance_amount, revision_limit, package_snapshot
  ) values (
    request_row.id, request_row.client_id, response_row.artist_id, 'pending_deposit', response_row.quote_amount,
    round(response_row.quote_amount * 0.3, 2), round(response_row.quote_amount * 0.7, 2), response_row.revision_limit,
    jsonb_build_object('id', package_row.id, 'tier', package_row.tier, 'title', package_row.title,
      'price', package_row.price, 'delivery_days', response_row.delivery_days,
      'revision_limit', response_row.revision_limit, 'features', package_row.features)
  ) returning id into new_order_id;

  update public.commission_requests set status = 'confirmed', selected_response_id = response_row.id where id = request_row.id;
  update public.commission_responses set status = case when id = response_row.id then 'selected' else 'not_selected' end, updated_at = now() where request_id = request_row.id and status = 'submitted';
  insert into public.order_status_logs (order_id, actor_id, from_status, to_status, note)
  values (new_order_id, auth.uid(), null, 'pending_deposit', '委托人从公开响应中选定画师');
  return new_order_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_commission_market()
 RETURNS TABLE(request_id uuid, title text, brief text, service_type text, budget_min numeric, budget_max numeric, deadline date, usage_scope text, collection_ends_at timestamp with time zone, response_count bigint, lowest_quote numeric, highest_quote numeric, my_response_id uuid)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select r.id, r.title, r.brief, r.service_type, r.budget_min, r.budget_max,
    r.deadline, r.usage_scope, r.collection_ends_at,
    count(resp.id) filter (where public.is_active_account() and resp.status = 'submitted' and resp.valid_until > now()),
    min(resp.quote_amount) filter (where resp.status = 'submitted' and resp.valid_until > now()),
    max(resp.quote_amount) filter (where resp.status = 'submitted' and resp.valid_until > now()),
    (array_agg(resp.id) filter (where resp.artist_id = auth.uid() and resp.status = 'submitted'))[1]
  from public.commission_requests r
  left join public.commission_responses resp on resp.request_id = r.id
  where r.request_mode = 'public'
    and r.moderation_status in ('auto_approved', 'approved')
    and r.status in ('pending_artist', 'quoted')
    and r.collection_ends_at > now()
    and exists (select 1 from public.artist_profiles a where a.user_id = auth.uid() and a.review_status = 'approved')
  group by r.id
  order by r.created_at desc;
$function$;

CREATE OR REPLACE FUNCTION public.unlock_portfolio(target_portfolio_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  item public.portfolios%rowtype;
  updated_balance integer;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
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
$function$;

CREATE OR REPLACE FUNCTION public.publish_shop_product(product_title text, product_description text, product_kind product_kind, product_price numeric, product_stock integer DEFAULT NULL::integer, product_cover_url text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare new_product_id uuid; account_role public.platform_role;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
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
$function$;

CREATE OR REPLACE FUNCTION public.review_public_commission_request(target_request_id uuid, review_decision text, review_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  previous_status text;
  previous_reason text;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  if not public.is_admin() then raise exception 'admin access required'; end if;
  if review_decision not in ('approved', 'revision_requested', 'rejected', 'hidden') then raise exception 'invalid review decision'; end if;
  if char_length(trim(review_note)) < 5 then raise exception 'review note required'; end if;
  select moderation_status, moderation_reason into previous_status, previous_reason
  from public.commission_requests
  where id = target_request_id and request_mode = 'public'
  for update;
  if previous_status is null then raise exception 'public request not found'; end if;
  update public.commission_requests
  set moderation_status = review_decision, moderation_reason = trim(review_note)
  where id = target_request_id;
  insert into public.platform_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (
    auth.uid(), 'review_public_commission_request', 'commission_request', target_request_id::text,
    jsonb_build_object('previous_status', previous_status, 'next_status', review_decision,
      'previous_reason', previous_reason, 'reason', trim(review_note))
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_commission_orders()
 RETURNS TABLE(id uuid, request_id uuid, status commission_status, quoted_amount numeric, deposit_amount numeric, balance_amount numeric, deposit_status payment_status, balance_status payment_status, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select orders.id, orders.request_id, orders.status, orders.quoted_amount,
    orders.deposit_amount, orders.balance_amount, orders.deposit_status,
    orders.balance_status, orders.created_at
  from public.commission_orders orders
  where public.is_active_account() and (auth.uid() in (orders.client_id, orders.artist_id) or public.is_admin())
  order by orders.created_at desc;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_cart()
 RETURNS TABLE(product_id uuid, quantity integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select items.product_id, items.quantity
  from public.cart_items items
  where public.is_active_account() and items.user_id = auth.uid()
  order by items.created_at;
$function$;

CREATE OR REPLACE FUNCTION public.admin_review_privacy_request(target_request_id uuid, next_status text, review_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  if not public.is_admin() then raise exception 'admin access required'; end if;
  if next_status not in ('in_review', 'awaiting_user', 'completed', 'rejected') then raise exception 'invalid status'; end if;
  if char_length(trim(review_note)) < 5 then raise exception 'review note required'; end if;

  update public.privacy_requests
  set status = next_status,
      resolution = trim(review_note),
      resolved_by = case when next_status in ('completed', 'rejected') then auth.uid() else null end,
      resolved_at = case when next_status in ('completed', 'rejected') then now() else null end,
      updated_at = now()
  where id = target_request_id;
  if not found then raise exception 'privacy request not found'; end if;

  insert into public.platform_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'admin_review_privacy_request', 'privacy_request', target_request_id::text,
    jsonb_build_object('status', next_status, 'note', trim(review_note)));
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_review_trust_case(target_case_id uuid, next_status text, review_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  if not public.is_admin() then raise exception 'admin access required'; end if;
  if next_status not in ('triaged', 'in_review', 'awaiting_user', 'actioned', 'rejected') then raise exception 'invalid status'; end if;
  if char_length(trim(review_note)) < 5 then raise exception 'review note required'; end if;

  update public.trust_cases
  set status = next_status,
      resolution = trim(review_note),
      resolved_by = case when next_status in ('actioned', 'rejected') then auth.uid() else null end,
      resolved_at = case when next_status in ('actioned', 'rejected') then now() else null end,
      updated_at = now()
  where id = target_case_id;
  if not found then raise exception 'trust case not found'; end if;

  insert into public.platform_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'admin_review_trust_case', 'trust_case', target_case_id::text,
    jsonb_build_object('status', next_status, 'note', trim(review_note)));
end;
$function$;

CREATE OR REPLACE FUNCTION public.accept_legal_document(target_document_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not exists (
    select 1 from public.legal_documents
    where id = target_document_id and is_active
  ) then
    raise exception 'active legal document not found';
  end if;

  insert into public.legal_consents (user_id, document_id, accepted_at, withdrawn_at)
  values (auth.uid(), target_document_id, now(), null)
  on conflict (user_id, document_id) do update
  set accepted_at = excluded.accepted_at,
      withdrawn_at = null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_support_ticket(target_ticket_id uuid, next_status text, next_priority text, reply_body text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  if not public.is_admin() then raise exception 'admin access required'; end if;
  if next_status not in ('open', 'in_progress', 'waiting_user', 'resolved', 'closed') then raise exception 'invalid status'; end if;
  if next_priority not in ('low', 'normal', 'high', 'urgent') then raise exception 'invalid priority'; end if;

  update public.support_tickets
  set status = next_status,
      priority = next_priority,
      assigned_to = auth.uid(),
      resolved_at = case when next_status in ('resolved', 'closed') then now() else null end,
      updated_at = now()
  where id = target_ticket_id;
  if not found then raise exception 'support ticket not found'; end if;

  if nullif(trim(coalesce(reply_body, '')), '') is not null then
    insert into public.support_ticket_messages (ticket_id, author_id, body)
    values (target_ticket_id, auth.uid(), trim(reply_body));
  end if;

  insert into public.platform_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'admin_update_support_ticket', 'support_ticket', target_ticket_id::text,
    jsonb_build_object('status', next_status, 'priority', next_priority, 'replied', nullif(trim(coalesce(reply_body, '')), '') is not null));
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_resolve_operations_event(target_event_id uuid, resolution_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  if not public.is_admin() then raise exception 'admin access required'; end if;
  if char_length(trim(resolution_note)) < 5 then raise exception 'resolution note required'; end if;

  update public.operations_events
  set resolved_at = now(), resolved_by = auth.uid(), resolution = trim(resolution_note)
  where id = target_event_id and resolved_at is null;
  if not found then raise exception 'open operations event not found'; end if;

  insert into public.platform_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'admin_resolve_operations_event', 'operations_event', target_event_id::text,
    jsonb_build_object('resolution', trim(resolution_note)));
end;
$function$;

CREATE OR REPLACE FUNCTION public.submit_artist_application(application_headline text, application_introduction text)
 RETURNS artist_profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  result public.artist_profiles;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if char_length(trim(coalesce(application_headline, ''))) < 4 then
    raise exception 'headline is too short';
  end if;
  if char_length(trim(coalesce(application_introduction, ''))) < 20 then
    raise exception 'introduction is too short';
  end if;

  insert into public.artist_profiles (
    user_id,
    headline,
    introduction,
    review_status,
    availability,
    reviewed_by,
    reviewed_at
  )
  values (
    auth.uid(),
    trim(application_headline),
    trim(application_introduction),
    'pending',
    'open',
    null,
    null
  )
  on conflict (user_id) do update
  set headline = excluded.headline,
      introduction = excluded.introduction,
      review_status = case
        when artist_profiles.review_status = 'approved' then 'approved'::public.artist_review_status
        else 'pending'::public.artist_review_status
      end,
      reviewed_by = case
        when artist_profiles.review_status = 'approved' then artist_profiles.reviewed_by
        else null
      end,
      reviewed_at = case
        when artist_profiles.review_status = 'approved' then artist_profiles.reviewed_at
        else null
      end
  returning * into result;

  return result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.review_artist_application(target_user_id uuid, decision artist_review_status)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  if not public.is_admin() then raise exception 'admin access required'; end if;
  if decision not in ('approved', 'rejected') then raise exception 'invalid review decision'; end if;
  if decision = 'approved' and not exists (
    select 1 from public.artist_identity_verifications
    where user_id = target_user_id and verification_status = 'verified'
      and next_reverification_at > now()
  ) then raise exception 'active verified identity required'; end if;

  update public.artist_profiles
  set review_status = decision, reviewed_by = auth.uid(), reviewed_at = now()
  where user_id = target_user_id;
  if not found then raise exception 'artist application not found'; end if;

  update public.profiles
  set role = case when decision = 'approved' then 'artist'::public.platform_role else 'user'::public.platform_role end,
      updated_at = now()
  where id = target_user_id;

  insert into public.platform_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'review_artist_application', 'artist_profile', target_user_id::text,
    jsonb_build_object('decision', decision));
end;
$function$;

CREATE OR REPLACE FUNCTION public.submit_artist_identity_verification(application_operator_type text, application_legal_name text, application_document_type text, application_document_last4 text, application_contact_phone text, application_operating_address text, application_business_name text DEFAULT NULL::text, application_uscc text DEFAULT NULL::text, application_attestation boolean DEFAULT false)
 RETURNS artist_identity_verifications
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  result public.artist_identity_verifications;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not application_attestation then raise exception 'identity attestation required'; end if;
  if application_operator_type not in ('individual', 'sole_proprietor', 'company') then raise exception 'invalid operator type'; end if;
  if application_document_type not in ('cn_id', 'passport', 'business_license') then raise exception 'invalid document type'; end if;
  if trim(application_document_last4) !~ '^[0-9A-Za-z]{4}$' then raise exception 'document last four required'; end if;
  if application_operator_type <> 'individual' and (char_length(trim(coalesce(application_business_name, ''))) < 2 or char_length(trim(coalesce(application_uscc, ''))) <> 18) then
    raise exception 'business registration details required';
  end if;
  if not exists (
    select 1 from public.legal_documents d
    join public.legal_consents c on c.document_id = d.id
    where c.user_id = auth.uid() and c.withdrawn_at is null and d.is_active and d.document_type in ('privacy', 'creator_agreement')
    group by c.user_id having count(distinct d.document_type) = 2
  ) then raise exception 'active privacy and creator agreements must be accepted'; end if;

  insert into public.artist_identity_verifications (
    user_id, operator_type, legal_name, document_type, document_last4,
    contact_phone, operating_address, business_name, unified_social_credit_code,
    verification_status, applicant_attestation, submitted_at, rejection_reason, updated_at
  ) values (
    auth.uid(), application_operator_type, trim(application_legal_name), application_document_type,
    upper(trim(application_document_last4)), trim(application_contact_phone), trim(application_operating_address),
    nullif(trim(coalesce(application_business_name, '')), ''), nullif(upper(trim(coalesce(application_uscc, ''))), ''),
    'pending', true, now(), null, now()
  )
  on conflict (user_id) do update set
    operator_type = excluded.operator_type,
    legal_name = excluded.legal_name,
    document_type = excluded.document_type,
    document_last4 = excluded.document_last4,
    contact_phone = excluded.contact_phone,
    operating_address = excluded.operating_address,
    business_name = excluded.business_name,
    unified_social_credit_code = excluded.unified_social_credit_code,
    verification_status = 'pending',
    applicant_attestation = true,
    submitted_at = now(),
    rejection_reason = null,
    verified_at = null,
    verified_by = null,
    next_reverification_at = null,
    updated_at = now()
  returning * into result;
  return result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.review_artist_identity_verification(target_user_id uuid, decision text, review_note text, method text, provider_name text, provider_reference text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  if not public.is_admin() then raise exception 'admin access required'; end if;
  if decision not in ('verified', 'needs_info', 'rejected') then raise exception 'invalid decision'; end if;
  if char_length(trim(review_note)) < 5 then raise exception 'review note required'; end if;
  if decision = 'verified' and (method not in ('manual_offline', 'contracted_provider') or char_length(trim(provider_reference)) < 4) then
    raise exception 'verification evidence reference required';
  end if;

  update public.artist_identity_verifications set
    verification_status = decision,
    verification_method = case when decision = 'verified' then method else verification_method end,
    verification_provider = case when decision = 'verified' then nullif(trim(provider_name), '') else verification_provider end,
    verification_reference = case when decision = 'verified' then trim(provider_reference) else verification_reference end,
    rejection_reason = case when decision in ('needs_info', 'rejected') then trim(review_note) else null end,
    verified_at = case when decision = 'verified' then now() else null end,
    verified_by = case when decision = 'verified' then auth.uid() else null end,
    next_reverification_at = case when decision = 'verified' then now() + interval '6 months' else null end,
    updated_at = now()
  where user_id = target_user_id;
  if not found then raise exception 'identity application not found'; end if;

  insert into public.compliance_review_records (review_scope, target_id, result, findings, remediation_due_at, reviewed_by)
  values ('artist_identity', target_user_id::text,
    case when decision = 'verified' then 'pass' when decision = 'needs_info' then 'remediation_required' else 'blocked' end,
    trim(review_note), case when decision = 'needs_info' then now() + interval '7 days' else null end, auth.uid());

  insert into public.platform_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'review_artist_identity', 'artist_identity', target_user_id::text,
    jsonb_build_object('decision', decision, 'method', method, 'note', trim(review_note)));
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_compliance_review(target_scope text, target_entity_id text, review_result text, review_findings text, remediation_due timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare result_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  if not public.is_admin() then raise exception 'admin access required'; end if;
  insert into public.compliance_review_records (review_scope, target_id, result, findings, remediation_due_at, reviewed_by)
  values (target_scope, nullif(trim(target_entity_id), ''), review_result, trim(review_findings), remediation_due, auth.uid())
  returning id into result_id;
  insert into public.platform_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'record_compliance_review', 'compliance_review', result_id::text,
    jsonb_build_object('scope', target_scope, 'result', review_result));
  return result_id;
end;
$function$;

-- Keep only non-sensitive boolean policy helpers executable by anonymous visitors.
do $$ declare fn record; begin
  for fn in select p.oid::regprocedure as signature, p.proname from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef and p.proname in ('notify_commission_request_change','notify_commission_order_change','mark_notification_read','mark_all_notifications_read','handle_new_user','is_admin','artist_respond_to_commission','simulate_commission_deposit','confirm_commission_quote','submit_commission_delivery','review_commission_delivery','simulate_commission_balance','open_commission_dispute','resolve_commission_dispute','ensure_order_conversation','send_order_message','mark_order_notifications_read','push_commission_notification','set_cart_quantity','checkout_shop_cart','admin_moderate_product','advance_shop_order','portfolio_object_path','submit_shop_fulfillment','can_access_shop_delivery','withdraw_legal_consent','checkout_shop_cart_with_address','attach_shop_delivery_file','admin_manage_user','can_read_shop_order','admin_moderate_service','submit_artist_review','checkout_single_product','simulate_point_purchase','publish_public_commission','submit_public_commission_response','select_public_commission_response','get_public_commission_market','unlock_portfolio','publish_shop_product','review_public_commission_request','get_my_commission_orders','get_my_cart','admin_review_privacy_request','admin_review_trust_case','accept_legal_document','admin_update_support_ticket','admin_resolve_operations_event','submit_artist_application','review_artist_application','submit_artist_identity_verification','review_artist_identity_verification','record_compliance_review')
  loop
    if fn.proname in ('is_admin','can_read_shop_order','can_access_shop_delivery') then continue; end if;
    execute format('revoke execute on function %s from public, anon', fn.signature);
    if fn.proname in ('handle_new_user','notify_commission_request_change','notify_commission_order_change','push_commission_notification') then
      execute format('revoke execute on function %s from authenticated', fn.signature);
    end if;
  end loop;
end $$;

-- Restrictive policies AND with existing ownership rules, rather than granting access.
do $$ declare tbl record; begin
  for tbl in select n.nspname, c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where c.relkind='r' and c.relrowsecurity and (n.nspname='public' or (n.nspname='storage' and c.relname='objects'))
  loop
    execute format('create policy active_account_required on %I.%I as restrictive for all to authenticated using ((select public.is_active_account())) with check ((select public.is_active_account()))', tbl.nspname,tbl.relname);
  end loop;
end $$;

-- Future migrations must explicitly grant intended API access.
alter default privileges revoke execute on functions from public, anon, authenticated;
notify pgrst, 'reload schema';
