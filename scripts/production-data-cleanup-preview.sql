-- READ-ONLY production data cleanup preview.
-- This file never deletes data. Review its result before creating an approved
-- cleanup transaction for specific IDs.

with suspected_accounts as (
  select
    profiles.id,
    users.email,
    profiles.display_name,
    profiles.role,
    profiles.created_at
  from public.profiles
  join auth.users users on users.id = profiles.id
  where
    lower(coalesce(users.email, '')) ~ '(test|demo|example|oc-forge\\.dev)'
    or lower(coalesce(profiles.display_name, '')) ~ '(test|demo|测试|演示)'
),
related_counts as (
  select
    account.id,
    account.email,
    account.display_name,
    account.role,
    account.created_at,
    (select count(*) from public.commission_requests row where row.client_id = account.id) as commission_requests,
    (select count(*) from public.commission_orders row where row.client_id = account.id or row.artist_id = account.id) as commission_orders,
    (select count(*) from public.shop_orders row where row.buyer_id = account.id) as shop_orders,
    (select count(*) from public.products row where row.seller_id = account.id) as products,
    (select count(*) from public.portfolios row where row.artist_id = account.id) as portfolios,
    (select count(*) from public.notifications row where row.user_id = account.id) as notifications
  from suspected_accounts account
)
select *
from related_counts
order by created_at;

-- Additional aggregate preview. These counts help detect simulated commerce
-- records without selecting private message or address contents.
select 'shop_orders' as entity, payment_status::text as status, count(*) as row_count
from public.shop_orders
group by payment_status
union all
select 'commission_deposits', deposit_status::text, count(*)
from public.commission_orders
group by deposit_status
union all
select 'commission_balances', balance_status::text, count(*)
from public.commission_orders
group by balance_status
order by entity, status;
