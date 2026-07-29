-- Monitoring, alerting, customer support and disaster-recovery baseline.

create table if not exists public.operations_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  source text not null check (source in ('client', 'server', 'database', 'auth', 'storage', 'manual')),
  event_code text not null check (char_length(event_code) between 3 and 80),
  message text not null check (char_length(trim(message)) between 3 and 500),
  route text check (route is null or char_length(route) <= 300),
  context jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolution text,
  created_at timestamptz not null default now(),
  check (pg_column_size(context) <= 8192)
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('account', 'commission', 'shop', 'copyright', 'privacy', 'technical', 'other')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  subject text not null check (char_length(trim(subject)) between 4 and 120),
  description text not null check (char_length(trim(description)) between 10 and 4000),
  status text not null default 'open' check (status in ('open', 'in_progress', 'waiting_user', 'resolved', 'closed')),
  assigned_to uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  internal_note boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.recovery_runs (
  id uuid primary key default gen_random_uuid(),
  scenario text not null check (scenario in ('database_restore', 'storage_restore', 'deployment_rollback', 'credential_rotation', 'full_recovery')),
  status text not null check (status in ('planned', 'running', 'passed', 'failed')),
  environment text not null default 'production' check (environment in ('production', 'staging', 'local')),
  rpo_minutes integer check (rpo_minutes is null or rpo_minutes >= 0),
  rto_minutes integer check (rto_minutes is null or rto_minutes >= 0),
  notes text not null check (char_length(trim(notes)) between 5 and 4000),
  evidence_url text,
  started_by uuid not null references public.profiles(id),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists operations_events_open_idx on public.operations_events (severity, created_at desc) where resolved_at is null;
create index if not exists operations_events_code_idx on public.operations_events (event_code, created_at desc);
create index if not exists support_tickets_user_idx on public.support_tickets (user_id, created_at desc);
create index if not exists support_tickets_queue_idx on public.support_tickets (status, priority, created_at);
create index if not exists support_messages_ticket_idx on public.support_ticket_messages (ticket_id, created_at);
create index if not exists recovery_runs_created_idx on public.recovery_runs (created_at desc);

alter table public.operations_events enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;
alter table public.recovery_runs enable row level security;

create policy "admins read operations events"
on public.operations_events for select using (public.is_admin());

create policy "authenticated users report own client events"
on public.operations_events for insert
with check (
  auth.uid() is not null
  and user_id = auth.uid()
  and source = 'client'
  and severity in ('info', 'warning')
  and resolved_at is null
  and resolved_by is null
  and resolution is null
);

create policy "admins manage operations events"
on public.operations_events for update
using (public.is_admin()) with check (public.is_admin());

create policy "users read own support tickets"
on public.support_tickets for select
using (user_id = auth.uid() or public.is_admin());

create policy "users create own support tickets"
on public.support_tickets for insert
with check (
  user_id = auth.uid()
  and status = 'open'
  and assigned_to is null
  and resolved_at is null
);

create policy "admins update support tickets"
on public.support_tickets for update
using (public.is_admin()) with check (public.is_admin());

create policy "participants read support messages"
on public.support_ticket_messages for select
using (
  public.is_admin()
  or exists (
    select 1 from public.support_tickets ticket
    where ticket.id = ticket_id
      and ticket.user_id = auth.uid()
      and not internal_note
  )
);

create policy "users reply to own support tickets"
on public.support_ticket_messages for insert
with check (
  author_id = auth.uid()
  and not internal_note
  and exists (
    select 1 from public.support_tickets ticket
    where ticket.id = ticket_id
      and ticket.user_id = auth.uid()
      and ticket.status not in ('closed')
  )
);

create policy "admins add support messages"
on public.support_ticket_messages for insert
with check (public.is_admin() and author_id = auth.uid());

create policy "admins read recovery runs"
on public.recovery_runs for select using (public.is_admin());

create policy "admins create recovery runs"
on public.recovery_runs for insert
with check (public.is_admin() and started_by = auth.uid());

create policy "admins update recovery runs"
on public.recovery_runs for update
using (public.is_admin()) with check (public.is_admin());

grant select, insert on public.operations_events to authenticated;
grant select, insert on public.support_tickets to authenticated;
grant select, insert on public.support_ticket_messages to authenticated;
grant select, insert on public.recovery_runs to authenticated;

create or replace function public.admin_update_support_ticket(
  target_ticket_id uuid,
  next_status text,
  next_priority text,
  reply_body text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'admin access required'; end if;
  if next_status not in ('open', 'in_progress', 'waiting_user', 'resolved', 'closed') then raise exception 'invalid status'; end if;
  if next_priority not in ('low', 'normal', 'high', 'urgent') then raise exception 'invalid priority'; end if;

  update public.support_tickets
  set status = next_status,
      priority = next_priority,
      assigned_to = auth.uid(),
      resolved_at = case when next_status in ('resolved', 'closed') then now() else null end,
      updated_at = now()
  where id = target_ticket_id;
  if not found then raise exception 'support ticket not found'; end if;

  if nullif(trim(coalesce(reply_body, '')), '') is not null then
    insert into public.support_ticket_messages (ticket_id, author_id, body)
    values (target_ticket_id, auth.uid(), trim(reply_body));
  end if;

  insert into public.platform_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'admin_update_support_ticket', 'support_ticket', target_ticket_id::text,
    jsonb_build_object('status', next_status, 'priority', next_priority, 'replied', nullif(trim(coalesce(reply_body, '')), '') is not null));
end;
$$;

create or replace function public.admin_resolve_operations_event(
  target_event_id uuid,
  resolution_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'admin access required'; end if;
  if char_length(trim(resolution_note)) < 5 then raise exception 'resolution note required'; end if;

  update public.operations_events
  set resolved_at = now(), resolved_by = auth.uid(), resolution = trim(resolution_note)
  where id = target_event_id and resolved_at is null;
  if not found then raise exception 'open operations event not found'; end if;

  insert into public.platform_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'admin_resolve_operations_event', 'operations_event', target_event_id::text,
    jsonb_build_object('resolution', trim(resolution_note)));
end;
$$;

revoke execute on function public.admin_update_support_ticket(uuid, text, text, text) from public, anon;
revoke execute on function public.admin_resolve_operations_event(uuid, text) from public, anon;
grant execute on function public.admin_update_support_ticket(uuid, text, text, text) to authenticated;
grant execute on function public.admin_resolve_operations_event(uuid, text) to authenticated;
