create or replace function public.submit_commission_delivery(
  target_order_id uuid,
  delivery_kind text,
  delivery_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.commission_orders%rowtype;
  delivery_id uuid;
  next_status public.commission_status;
begin
  select * into order_row from public.commission_orders where id = target_order_id;
  if order_row.id is null then raise exception 'commission order not found'; end if;
  if auth.uid() <> order_row.artist_id and not public.is_admin() then raise exception 'artist access required'; end if;

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
$$;

create or replace function public.review_commission_delivery(
  target_delivery_id uuid,
  review_decision text,
  review_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  delivery_row public.order_deliveries%rowtype;
  order_row public.commission_orders%rowtype;
  next_status public.commission_status;
begin
  select * into delivery_row from public.order_deliveries where id = target_delivery_id;
  if delivery_row.id is null then raise exception 'delivery not found'; end if;
  select * into order_row from public.commission_orders where id = delivery_row.order_id;
  if auth.uid() <> order_row.client_id and not public.is_admin() then raise exception 'client access required'; end if;
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
$$;

create or replace function public.simulate_commission_balance(target_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.commission_orders%rowtype;
begin
  select * into order_row from public.commission_orders where id = target_order_id;
  if order_row.id is null then raise exception 'commission order not found'; end if;
  if auth.uid() <> order_row.client_id and not public.is_admin() then raise exception 'client access required'; end if;

  update public.commission_orders
  set balance_status = 'paid', status = 'completed', updated_at = now()
  where id = target_order_id and status = 'pending_balance' and balance_status = 'unpaid';
  if not found then raise exception 'balance cannot be paid in current state'; end if;

  insert into public.order_status_logs (order_id, actor_id, from_status, to_status, note)
  values (target_order_id, auth.uid(), 'pending_balance', 'completed', '模拟尾款支付成功，订单完成');
end;
$$;

revoke all on function public.submit_commission_delivery(uuid, text, text) from public;
revoke all on function public.review_commission_delivery(uuid, text, text) from public;
revoke all on function public.simulate_commission_balance(uuid) from public;
grant execute on function public.submit_commission_delivery(uuid, text, text) to authenticated;
grant execute on function public.review_commission_delivery(uuid, text, text) to authenticated;
grant execute on function public.simulate_commission_balance(uuid) to authenticated;

