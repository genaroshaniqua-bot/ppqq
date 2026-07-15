alter table public.profiles
  add column if not exists point_balance integer not null default 120 check (point_balance >= 0),
  add column if not exists membership_plan text not null default 'free' check (membership_plan in ('free', 'basic', 'premium')),
  add column if not exists membership_expires_at timestamptz;

create table if not exists public.point_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  package_code text not null check (package_code in ('basic_monthly', 'premium_monthly', 'project_pack')),
  points integer not null check (points > 0),
  amount numeric(12, 2) not null check (amount >= 0),
  payment_status public.payment_status not null default 'paid',
  payment_method text not null default 'simulated',
  created_at timestamptz not null default now()
);

alter table public.point_purchases enable row level security;

drop policy if exists "users can read own point purchases" on public.point_purchases;
create policy "users can read own point purchases"
  on public.point_purchases for select
  using (user_id = auth.uid());

create or replace function public.simulate_point_purchase(target_package text)
returns table (
  purchase_id uuid,
  added_points integer,
  new_balance integer,
  active_plan text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  package_points integer;
  package_amount numeric(12, 2);
  package_plan text;
  next_expiry timestamptz;
  created_purchase uuid;
  updated_balance integer;
begin
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
$$;

revoke all on function public.simulate_point_purchase(text) from public;
grant execute on function public.simulate_point_purchase(text) to authenticated;
