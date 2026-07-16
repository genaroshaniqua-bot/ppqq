alter table public.commission_requests
  add column if not exists request_mode text not null default 'direct' check (request_mode in ('direct', 'public')),
  add column if not exists service_type text,
  add column if not exists moderation_status text not null default 'approved' check (moderation_status in ('draft', 'auto_approved', 'pending_review', 'approved', 'revision_requested', 'rejected', 'hidden')),
  add column if not exists moderation_reason text,
  add column if not exists collection_days integer check (collection_days in (3, 7, 14)),
  add column if not exists collection_ends_at timestamptz,
  add column if not exists selected_response_id uuid,
  add column if not exists reports_count integer not null default 0 check (reports_count >= 0);

create table if not exists public.commission_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.commission_requests(id) on delete cascade,
  artist_id uuid not null references public.artist_profiles(user_id) on delete cascade,
  service_id uuid not null references public.artist_services(id),
  package_id uuid not null references public.service_packages(id),
  quote_amount numeric(12, 2) not null check (quote_amount > 0),
  delivery_days integer not null check (delivery_days > 0),
  revision_limit integer not null check (revision_limit >= 0),
  proposal_note text not null check (char_length(proposal_note) between 10 and 1000),
  status text not null default 'submitted' check (status in ('submitted', 'selected', 'not_selected', 'withdrawn', 'expired', 'removed')),
  valid_until timestamptz not null default (now() + interval '72 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(request_id, artist_id)
);

alter table public.commission_requests
  drop constraint if exists commission_requests_selected_response_id_fkey;
alter table public.commission_requests
  add constraint commission_requests_selected_response_id_fkey
  foreign key (selected_response_id) references public.commission_responses(id) on delete set null;

alter table public.commission_responses enable row level security;

drop policy if exists "public requests readable by approved artists" on public.commission_requests;
create policy "public requests readable by approved artists"
on public.commission_requests for select
using (
  request_mode = 'public'
  and moderation_status in ('auto_approved', 'approved')
  and status in ('pending_artist', 'quoted')
  and collection_ends_at > now()
  and exists (select 1 from public.artist_profiles a where a.user_id = auth.uid() and a.review_status = 'approved')
);

drop policy if exists "request participants read responses" on public.commission_responses;
create policy "request participants read responses"
on public.commission_responses for select
using (
  artist_id = auth.uid()
  or exists (select 1 from public.commission_requests r where r.id = request_id and r.client_id = auth.uid())
  or public.is_admin()
);

drop policy if exists "approved artists insert responses" on public.commission_responses;
create policy "approved artists insert responses"
on public.commission_responses for insert
with check (
  artist_id = auth.uid()
  and exists (select 1 from public.artist_profiles a where a.user_id = auth.uid() and a.review_status = 'approved')
);

drop policy if exists "artists update own responses" on public.commission_responses;
create policy "artists update own responses"
on public.commission_responses for update
using (artist_id = auth.uid() or public.is_admin())
with check (artist_id = auth.uid() or public.is_admin());

create or replace function public.publish_public_commission(
  request_title text,
  request_brief text,
  request_service_type text,
  request_budget_min numeric,
  request_budget_max numeric,
  request_deadline date,
  request_usage_scope text,
  request_collection_days integer,
  request_allow_public_display boolean default false,
  request_allow_ai_training boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_request_id uuid;
  next_moderation text;
  risk_reason text;
begin
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
$$;

create or replace function public.submit_public_commission_response(
  target_request_id uuid,
  target_service_id uuid,
  target_package_id uuid,
  response_quote numeric,
  response_delivery_days integer,
  response_note text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.commission_requests%rowtype;
  service_row public.artist_services%rowtype;
  package_row public.service_packages%rowtype;
  response_id uuid;
begin
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
$$;

create or replace function public.select_public_commission_response(target_response_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  response_row public.commission_responses%rowtype;
  request_row public.commission_requests%rowtype;
  package_row public.service_packages%rowtype;
  new_order_id uuid;
begin
  select * into response_row from public.commission_responses where id = target_response_id for update;
  if response_row.id is null or response_row.status <> 'submitted' or response_row.valid_until <= now() then raise exception 'response is not selectable'; end if;
  select * into request_row from public.commission_requests where id = response_row.request_id for update;
  if auth.uid() <> request_row.client_id then raise exception 'client access required'; end if;
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
$$;

create or replace function public.review_public_commission_request(target_request_id uuid, review_decision text, review_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'admin access required'; end if;
  if review_decision not in ('approved', 'revision_requested', 'rejected', 'hidden') then raise exception 'invalid review decision'; end if;
  if char_length(trim(review_note)) < 5 then raise exception 'review note required'; end if;
  update public.commission_requests set moderation_status = review_decision, moderation_reason = trim(review_note)
  where id = target_request_id and request_mode = 'public';
  if not found then raise exception 'public request not found'; end if;
end;
$$;

create or replace function public.get_public_commission_market()
returns table (
  request_id uuid, title text, brief text, service_type text,
  budget_min numeric, budget_max numeric, deadline date, usage_scope text,
  collection_ends_at timestamptz, response_count bigint,
  lowest_quote numeric, highest_quote numeric, my_response_id uuid
)
language sql
security definer
set search_path = public
as $$
  select r.id, r.title, r.brief, r.service_type, r.budget_min, r.budget_max,
    r.deadline, r.usage_scope, r.collection_ends_at,
    count(resp.id) filter (where resp.status = 'submitted' and resp.valid_until > now()),
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
$$;

revoke all on function public.publish_public_commission(text,text,text,numeric,numeric,date,text,integer,boolean,boolean) from public;
revoke all on function public.submit_public_commission_response(uuid,uuid,uuid,numeric,integer,text) from public;
revoke all on function public.select_public_commission_response(uuid) from public;
revoke all on function public.review_public_commission_request(uuid,text,text) from public;
revoke all on function public.get_public_commission_market() from public;
grant execute on function public.publish_public_commission(text,text,text,numeric,numeric,date,text,integer,boolean,boolean) to authenticated;
grant execute on function public.submit_public_commission_response(uuid,uuid,uuid,numeric,integer,text) to authenticated;
grant execute on function public.select_public_commission_response(uuid) to authenticated;
grant execute on function public.review_public_commission_request(uuid,text,text) to authenticated;
grant execute on function public.get_public_commission_market() to authenticated;
