-- Artist identity admission, operator disclosure and compliance review baseline.
-- Full identity-document numbers are deliberately not stored. Verification is
-- completed through an offline or contracted provider and only a masked result
-- plus the provider/reference identifier is retained.

create table if not exists public.platform_operator_profile (
  id boolean primary key default true check (id),
  entity_name text,
  unified_social_credit_code text,
  registered_address text,
  customer_service_phone text,
  customer_service_email text,
  privacy_contact_email text,
  business_license_url text,
  icp_filing_number text,
  public_notice text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

insert into public.platform_operator_profile (id, public_notice)
values (true, '经营主体信息尚待运营方补充并复核，未完成前不得开启真实支付。')
on conflict (id) do nothing;

create table if not exists public.artist_identity_verifications (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  operator_type text not null check (operator_type in ('individual', 'sole_proprietor', 'company')),
  legal_name text not null check (char_length(trim(legal_name)) between 2 and 80),
  document_type text not null check (document_type in ('cn_id', 'passport', 'business_license')),
  document_last4 text not null check (document_last4 ~ '^[0-9A-Za-z]{4}$'),
  contact_phone text not null check (char_length(trim(contact_phone)) between 7 and 32),
  operating_address text not null check (char_length(trim(operating_address)) between 6 and 300),
  business_name text,
  unified_social_credit_code text,
  verification_status text not null default 'pending' check (verification_status in ('draft', 'pending', 'needs_info', 'verified', 'rejected', 'expired')),
  verification_method text check (verification_method in ('manual_offline', 'contracted_provider')),
  verification_provider text,
  verification_reference text,
  applicant_attestation boolean not null default false,
  rejection_reason text,
  submitted_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id),
  next_reverification_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    operator_type = 'individual'
    or (char_length(trim(coalesce(business_name, ''))) >= 2 and char_length(trim(coalesce(unified_social_credit_code, ''))) = 18)
  )
);

create table if not exists public.compliance_review_records (
  id uuid primary key default gen_random_uuid(),
  review_scope text not null check (review_scope in ('platform', 'artist_identity', 'legal_documents', 'privacy', 'content', 'copyright', 'operations')),
  target_id text,
  result text not null check (result in ('pass', 'conditional_pass', 'remediation_required', 'blocked')),
  findings text not null check (char_length(trim(findings)) between 5 and 5000),
  remediation_due_at timestamptz,
  reviewed_by uuid not null references public.profiles(id),
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists artist_identity_status_idx on public.artist_identity_verifications (verification_status, submitted_at);
create index if not exists artist_identity_reverification_idx on public.artist_identity_verifications (next_reverification_at) where verification_status = 'verified';
create index if not exists compliance_review_scope_idx on public.compliance_review_records (review_scope, reviewed_at desc);

alter table public.platform_operator_profile enable row level security;
alter table public.artist_identity_verifications enable row level security;
alter table public.compliance_review_records enable row level security;

create policy "operator profile is public"
on public.platform_operator_profile for select using (true);

create policy "admins update operator profile"
on public.platform_operator_profile for update
using (public.is_admin()) with check (public.is_admin());

create policy "users read own identity verification"
on public.artist_identity_verifications for select
using (user_id = auth.uid() or public.is_admin());

create policy "admins read compliance reviews"
on public.compliance_review_records for select
using (public.is_admin());

revoke insert, update, delete on public.artist_identity_verifications from authenticated;
revoke insert, update, delete on public.compliance_review_records from authenticated;
revoke insert, delete on public.platform_operator_profile from authenticated;
grant update (entity_name, unified_social_credit_code, registered_address, customer_service_phone, customer_service_email, privacy_contact_email, business_license_url, icp_filing_number, public_notice, updated_by, updated_at)
on public.platform_operator_profile to authenticated;

create or replace function public.submit_artist_identity_verification(
  application_operator_type text,
  application_legal_name text,
  application_document_type text,
  application_document_last4 text,
  application_contact_phone text,
  application_operating_address text,
  application_business_name text default null,
  application_uscc text default null,
  application_attestation boolean default false
)
returns public.artist_identity_verifications
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.artist_identity_verifications;
begin
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
$$;

create or replace function public.review_artist_identity_verification(
  target_user_id uuid,
  decision text,
  review_note text,
  method text,
  provider_name text,
  provider_reference text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
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
$$;

create or replace function public.record_compliance_review(
  target_scope text,
  target_entity_id text,
  review_result text,
  review_findings text,
  remediation_due timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare result_id uuid;
begin
  if not public.is_admin() then raise exception 'admin access required'; end if;
  insert into public.compliance_review_records (review_scope, target_id, result, findings, remediation_due_at, reviewed_by)
  values (target_scope, nullif(trim(target_entity_id), ''), review_result, trim(review_findings), remediation_due, auth.uid())
  returning id into result_id;
  insert into public.platform_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'record_compliance_review', 'compliance_review', result_id::text,
    jsonb_build_object('scope', target_scope, 'result', review_result));
  return result_id;
end;
$$;

create or replace function public.review_artist_application(
  target_user_id uuid,
  decision public.artist_review_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
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
$$;

revoke all on function public.submit_artist_identity_verification(text, text, text, text, text, text, text, text, boolean) from public, anon;
revoke all on function public.review_artist_identity_verification(uuid, text, text, text, text, text) from public, anon;
revoke all on function public.record_compliance_review(text, text, text, text, timestamptz) from public, anon;
grant execute on function public.submit_artist_identity_verification(text, text, text, text, text, text, text, text, boolean) to authenticated;
grant execute on function public.review_artist_identity_verification(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.record_compliance_review(text, text, text, text, timestamptz) to authenticated;

update public.legal_documents set is_active = false
where document_type in ('terms', 'privacy', 'creator_agreement', 'content_rules', 'copyright');

insert into public.legal_documents (document_type, version, title, summary, effective_at, is_active)
values
  ('terms', '2026-08-03', '用户服务协议', '正式版：账户、平台服务、交易规则、责任边界、争议与终止。', '2026-08-10 00:00:00+08', true),
  ('privacy', '2026-08-03', '隐私政策', '正式版：个人信息处理、实名核验、委托处理、保存期限与权利响应。', '2026-08-10 00:00:00+08', true),
  ('creator_agreement', '2026-08-03', '画师入驻与服务协议', '正式版：实名准入、经营者信息、服务交付、授权、评价与退出。', '2026-08-10 00:00:00+08', true),
  ('content_rules', '2026-08-03', '内容与社区规范', '正式版：禁止内容、分级审核、处置通知与人工申诉。', '2026-08-10 00:00:00+08', true),
  ('copyright', '2026-08-03', '版权保护规则', '正式版：权利保证、授权范围、通知、反通知与恢复。', '2026-08-10 00:00:00+08', true)
on conflict (document_type, version) do update set
  title = excluded.title, summary = excluded.summary, effective_at = excluded.effective_at, is_active = true;
