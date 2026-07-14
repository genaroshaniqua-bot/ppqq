alter table public.order_disputes
  add column if not exists previous_order_status public.commission_status;

create or replace function public.open_commission_dispute(
  target_order_id uuid,
  dispute_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.commission_orders%rowtype;
  dispute_id uuid;
begin
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
$$;

create or replace function public.resolve_commission_dispute(
  target_dispute_id uuid,
  resolution_action text,
  resolution_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  dispute_row public.order_disputes%rowtype;
  next_status public.commission_status;
begin
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
$$;

revoke all on function public.open_commission_dispute(uuid, text) from public;
revoke all on function public.resolve_commission_dispute(uuid, text, text) from public;
grant execute on function public.open_commission_dispute(uuid, text) to authenticated;
grant execute on function public.resolve_commission_dispute(uuid, text, text) to authenticated;

