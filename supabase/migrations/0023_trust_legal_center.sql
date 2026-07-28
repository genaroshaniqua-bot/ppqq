-- Legal, privacy-rights, reporting, copyright and appeal baseline.

create table if not exists public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  document_type text not null check (document_type in ('terms', 'privacy', 'creator_agreement', 'content_rules', 'copyright')),
  version text not null,
  title text not null,
  summary text not null default '',
  effective_at timestamptz not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (document_type, version)
);

create unique index if not exists legal_documents_one_active_version
  on public.legal_documents (document_type) where is_active;

create table if not exists public.legal_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_id uuid not null references public.legal_documents(id) on delete restrict,
  accepted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, document_id)
);

create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_type text not null check (request_type in ('access', 'export', 'correction', 'deletion', 'account_closure', 'consent_withdrawal', 'privacy_complaint')),
  details text not null check (char_length(trim(details)) between 10 and 4000),
  status text not null default 'submitted' check (status in ('submitted', 'in_review', 'awaiting_user', 'completed', 'rejected', 'cancelled')),
  resolution text,
  due_at timestamptz not null default (now() + interval '15 days'),
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trust_cases (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  case_type text not null check (case_type in ('content_report', 'copyright_notice', 'copyright_counter_notice', 'appeal')),
  target_type text not null check (target_type in ('portfolio', 'product', 'commission_request', 'profile', 'message', 'other')),
  target_id text not null,
  reason_code text not null,
  description text not null check (char_length(trim(description)) between 10 and 5000),
  claimant_name text,
  claimant_contact text,
  attestation boolean not null default false,
  evidence_urls text[] not null default '{}',
  parent_case_id uuid references public.trust_cases(id) on delete set null,
  status text not null default 'submitted' check (status in ('submitted', 'triaged', 'in_review', 'awaiting_user', 'actioned', 'rejected', 'withdrawn')),
  resolution text,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(evidence_urls) <= 8),
  check (
    case_type not in ('copyright_notice', 'copyright_counter_notice')
    or (
      char_length(trim(coalesce(claimant_name, ''))) >= 2
      and char_length(trim(coalesce(claimant_contact, ''))) >= 5
      and attestation
    )
  )
);

create index if not exists privacy_requests_user_created_idx on public.privacy_requests (user_id, created_at desc);
create index if not exists privacy_requests_status_created_idx on public.privacy_requests (status, created_at);
create index if not exists trust_cases_reporter_created_idx on public.trust_cases (reporter_id, created_at desc);
create index if not exists trust_cases_status_created_idx on public.trust_cases (status, created_at);
create index if not exists trust_cases_parent_idx on public.trust_cases (parent_case_id);

alter table public.legal_documents enable row level security;
alter table public.legal_consents enable row level security;
alter table public.privacy_requests enable row level security;
alter table public.trust_cases enable row level security;

create policy "active legal documents are public"
on public.legal_documents for select
using (is_active or public.is_admin());

create policy "users read own legal consents"
on public.legal_consents for select
using (user_id = auth.uid() or public.is_admin());

create policy "users record own legal consents"
on public.legal_consents for insert
with check (user_id = auth.uid());

create policy "users read own privacy requests"
on public.privacy_requests for select
using (user_id = auth.uid() or public.is_admin());

create policy "users submit own privacy requests"
on public.privacy_requests for insert
with check (user_id = auth.uid() and status = 'submitted');

create policy "users read own trust cases"
on public.trust_cases for select
using (reporter_id = auth.uid() or public.is_admin());

create policy "users submit own trust cases"
on public.trust_cases for insert
with check (reporter_id = auth.uid() and status = 'submitted');

revoke update, delete on public.legal_consents from authenticated;
revoke update, delete on public.privacy_requests from authenticated;
revoke update, delete on public.trust_cases from authenticated;

create or replace function public.withdraw_legal_consent(target_document_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.legal_consents
  set withdrawn_at = now()
  where user_id = auth.uid() and document_id = target_document_id and withdrawn_at is null;
end;
$$;

create or replace function public.admin_review_privacy_request(
  target_request_id uuid,
  next_status text,
  review_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
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
$$;

create or replace function public.admin_review_trust_case(
  target_case_id uuid,
  next_status text,
  review_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
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
$$;

revoke execute on function public.withdraw_legal_consent(uuid) from public, anon;
revoke execute on function public.admin_review_privacy_request(uuid, text, text) from public, anon;
revoke execute on function public.admin_review_trust_case(uuid, text, text) from public, anon;
grant execute on function public.withdraw_legal_consent(uuid) to authenticated;
grant execute on function public.admin_review_privacy_request(uuid, text, text) to authenticated;
grant execute on function public.admin_review_trust_case(uuid, text, text) to authenticated;

insert into public.legal_documents (document_type, version, title, summary, effective_at, is_active)
values
  ('terms', '2026-07-28', '用户服务协议', '说明账户、平台服务、用户行为、责任边界与终止规则。', '2026-07-28 00:00:00+08', true),
  ('privacy', '2026-07-28', '隐私政策', '说明个人信息处理目的、范围、保存期限与用户权利。', '2026-07-28 00:00:00+08', true),
  ('creator_agreement', '2026-07-28', '画师入驻与服务规则', '说明服务发布、交付、授权、评价及违规处理要求。', '2026-07-28 00:00:00+08', true),
  ('content_rules', '2026-07-28', '内容与社区规范', '说明禁止内容、审核、举报、处置及申诉机制。', '2026-07-28 00:00:00+08', true),
  ('copyright', '2026-07-28', '版权保护规则', '说明原创声明、授权范围、侵权投诉与反通知流程。', '2026-07-28 00:00:00+08', true)
on conflict (document_type, version) do update
set title = excluded.title,
    summary = excluded.summary,
    effective_at = excluded.effective_at,
    is_active = excluded.is_active;
