create table if not exists public.order_conversations (
  order_id uuid primary key references public.commission_orders(id) on delete cascade,
  conversation_id uuid not null unique references public.conversations(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  related_order_id uuid references public.commission_orders(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
alter table public.order_conversations enable row level security;
alter table public.notifications enable row level security;

create policy "order parties read order conversations" on public.order_conversations
for select using (
  exists (
    select 1 from public.commission_orders o
    where o.id = order_id and (auth.uid() in (o.client_id, o.artist_id) or public.is_admin())
  )
);

create policy "users read own notifications" on public.notifications
for select using (user_id = auth.uid() or public.is_admin());

create or replace function public.ensure_order_conversation(target_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.commission_orders%rowtype;
  existing_id uuid;
begin
  select * into order_row from public.commission_orders where id = target_order_id;
  if order_row.id is null then raise exception 'commission order not found'; end if;
  if auth.uid() not in (order_row.client_id, order_row.artist_id) and not public.is_admin() then raise exception 'order party access required'; end if;

  select conversation_id into existing_id from public.order_conversations where order_id = target_order_id;
  if existing_id is null then
    insert into public.conversations default values returning id into existing_id;
    insert into public.order_conversations (order_id, conversation_id) values (target_order_id, existing_id);
    insert into public.conversation_members (conversation_id, user_id)
    values (existing_id, order_row.client_id), (existing_id, order_row.artist_id)
    on conflict do nothing;
  end if;
  return existing_id;
end;
$$;

create or replace function public.send_order_message(target_order_id uuid, message_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.commission_orders%rowtype;
  conversation_uuid uuid;
  message_uuid uuid;
  recipient_id uuid;
begin
  select * into order_row from public.commission_orders where id = target_order_id;
  if order_row.id is null then raise exception 'commission order not found'; end if;
  if auth.uid() not in (order_row.client_id, order_row.artist_id) then raise exception 'order party access required'; end if;
  if length(trim(message_body)) < 1 or length(trim(message_body)) > 2000 then raise exception 'message length must be between 1 and 2000'; end if;

  conversation_uuid := public.ensure_order_conversation(target_order_id);
  insert into public.messages (conversation_id, sender_id, body)
  values (conversation_uuid, auth.uid(), trim(message_body)) returning id into message_uuid;

  recipient_id := case when auth.uid() = order_row.client_id then order_row.artist_id else order_row.client_id end;
  insert into public.notifications (user_id, type, title, body, related_order_id)
  values (recipient_id, 'commission_message', '约稿订单有新消息', left(trim(message_body), 120), target_order_id);
  return message_uuid;
end;
$$;

create or replace function public.mark_order_notifications_read(target_order_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications
  set read_at = now()
  where user_id = auth.uid() and related_order_id = target_order_id and read_at is null;
$$;

revoke all on function public.ensure_order_conversation(uuid) from public;
revoke all on function public.send_order_message(uuid, text) from public;
revoke all on function public.mark_order_notifications_read(uuid) from public;
grant execute on function public.ensure_order_conversation(uuid) to authenticated;
grant execute on function public.send_order_message(uuid, text) to authenticated;
grant execute on function public.mark_order_notifications_read(uuid) to authenticated;

