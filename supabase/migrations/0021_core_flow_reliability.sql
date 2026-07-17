-- Reliable role-scoped reads for the commission and shop workspaces.
create or replace function public.get_my_commission_orders()
returns table (
  id uuid,
  request_id uuid,
  status public.commission_status,
  quoted_amount numeric,
  deposit_amount numeric,
  balance_amount numeric,
  deposit_status public.payment_status,
  balance_status public.payment_status,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    orders.id,
    orders.request_id,
    orders.status,
    orders.quoted_amount,
    orders.deposit_amount,
    orders.balance_amount,
    orders.deposit_status,
    orders.balance_status,
    orders.created_at
  from public.commission_orders orders
  where auth.uid() in (orders.client_id, orders.artist_id)
     or public.is_admin()
  order by orders.created_at desc;
$$;

create or replace function public.get_my_cart()
returns table (product_id uuid, quantity integer)
language sql
stable
security definer
set search_path = public
as $$
  select items.product_id, items.quantity
  from public.cart_items items
  where items.user_id = auth.uid()
  order by items.created_at;
$$;

-- Public request moderation changes platform visibility and must be auditable.
create or replace function public.review_public_commission_request(
  target_request_id uuid,
  review_decision text,
  review_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_status text;
  previous_reason text;
begin
  if not public.is_admin() then raise exception 'admin access required'; end if;
  if review_decision not in ('approved', 'revision_requested', 'rejected', 'hidden') then raise exception 'invalid review decision'; end if;
  if char_length(trim(review_note)) < 5 then raise exception 'review note required'; end if;

  select moderation_status, moderation_reason
    into previous_status, previous_reason
  from public.commission_requests
  where id = target_request_id and request_mode = 'public'
  for update;

  if previous_status is null then raise exception 'public request not found'; end if;

  update public.commission_requests
  set moderation_status = review_decision,
      moderation_reason = trim(review_note)
  where id = target_request_id;

  insert into public.platform_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (
    auth.uid(),
    'review_public_commission_request',
    'commission_request',
    target_request_id::text,
    jsonb_build_object(
      'previous_status', previous_status,
      'next_status', review_decision,
      'previous_reason', previous_reason,
      'reason', trim(review_note)
    )
  );
end;
$$;

revoke all on function public.get_my_commission_orders() from public;
revoke all on function public.get_my_cart() from public;
grant execute on function public.get_my_commission_orders() to authenticated;
grant execute on function public.get_my_cart() to authenticated;
