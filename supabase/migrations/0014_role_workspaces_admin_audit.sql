alter table public.profiles
  add column if not exists account_status text not null default 'active'
  check (account_status in ('active', 'suspended'));

create table if not exists public.platform_audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid not null references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.platform_audit_logs enable row level security;

create policy "admins read platform audit logs"
on public.platform_audit_logs for select
using (public.is_admin());

grant select on public.platform_audit_logs to authenticated;

create policy "sellers read relevant shop orders"
on public.shop_orders for select
using (
  buyer_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.shop_order_items item
    join public.products product on product.id = item.product_id
    where item.order_id = shop_orders.id
      and product.seller_id = auth.uid()
  )
);

create or replace function public.admin_manage_user(
  target_user_id uuid,
  next_role public.platform_role,
  next_status text,
  change_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_profile public.profiles%rowtype;
begin
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
$$;

create or replace function public.admin_moderate_product(
  target_product_id uuid,
  next_active boolean,
  moderation_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_active boolean;
begin
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
$$;

revoke all on function public.admin_manage_user(uuid, public.platform_role, text, text) from public;
revoke all on function public.admin_moderate_product(uuid, boolean, text) from public;
grant execute on function public.admin_manage_user(uuid, public.platform_role, text, text) to authenticated;
grant execute on function public.admin_moderate_product(uuid, boolean, text) to authenticated;
