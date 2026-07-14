alter table public.commission_requests
  add column if not exists status text not null default 'pending_artist'
    check (status in ('pending_artist', 'quoted', 'rejected', 'confirmed')),
  add column if not exists quoted_amount numeric(12, 2),
  add column if not exists artist_response_note text;

create or replace function public.artist_respond_to_commission(
  target_request_id uuid,
  decision text,
  quote_amount numeric default null,
  response_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_artist_id uuid;
begin
  select service.artist_id into request_artist_id
  from public.commission_requests request
  join public.artist_services service on service.id = request.service_id
  where request.id = target_request_id;

  if request_artist_id is null then raise exception 'commission request not found'; end if;
  if auth.uid() <> request_artist_id and not public.is_admin() then raise exception 'artist access required'; end if;

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
  new_order_id uuid;
begin
  select * into request_row from public.commission_requests where id = target_request_id;
  if request_row.id is null then raise exception 'commission request not found'; end if;
  if auth.uid() <> request_row.client_id and not public.is_admin() then raise exception 'client access required'; end if;
  if request_row.status <> 'quoted' or request_row.quoted_amount is null then raise exception 'request is not ready for confirmation'; end if;

  select * into service_row from public.artist_services where id = request_row.service_id;
  insert into public.commission_orders (
    request_id, client_id, artist_id, status, quoted_amount,
    deposit_amount, balance_amount, revision_limit
  ) values (
    request_row.id, request_row.client_id, service_row.artist_id, 'pending_deposit', request_row.quoted_amount,
    round(request_row.quoted_amount * 0.3, 2), round(request_row.quoted_amount * 0.7, 2), service_row.revision_limit
  )
  returning id into new_order_id;

  update public.commission_requests set status = 'confirmed' where id = target_request_id;
  insert into public.order_status_logs (order_id, actor_id, from_status, to_status, note)
  values (new_order_id, auth.uid(), null, 'pending_deposit', '委托人已确认报价');
  return new_order_id;
end;
$$;

create or replace function public.simulate_commission_deposit(target_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  order_client_id uuid;
begin
  select client_id into order_client_id from public.commission_orders where id = target_order_id;
  if order_client_id is null then raise exception 'commission order not found'; end if;
  if auth.uid() <> order_client_id and not public.is_admin() then raise exception 'client access required'; end if;

  update public.commission_orders
  set deposit_status = 'paid', status = 'in_progress', updated_at = now()
  where id = target_order_id and status = 'pending_deposit' and deposit_status = 'unpaid';
  if not found then raise exception 'deposit cannot be paid in the current state'; end if;

  insert into public.order_status_logs (order_id, actor_id, from_status, to_status, note)
  values (target_order_id, auth.uid(), 'pending_deposit', 'in_progress', '模拟定金支付成功');
end;
$$;

revoke all on function public.artist_respond_to_commission(uuid, text, numeric, text) from public;
revoke all on function public.confirm_commission_quote(uuid) from public;
revoke all on function public.simulate_commission_deposit(uuid) from public;
grant execute on function public.artist_respond_to_commission(uuid, text, numeric, text) to authenticated;
grant execute on function public.confirm_commission_quote(uuid) to authenticated;
grant execute on function public.simulate_commission_deposit(uuid) to authenticated;

