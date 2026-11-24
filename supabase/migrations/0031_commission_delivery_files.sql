-- Private immutable delivery attachments, validated by the same transaction as the status change.
alter table public.order_deliveries add column file_paths text[] not null default '{}';
revoke insert, update, delete on public.order_deliveries from anon, authenticated;

create function public.can_read_commission_file(object_path text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_active_account() and exists (
    select 1 from public.order_deliveries d join public.commission_orders o on o.id=d.order_id
    where object_path=any(d.file_paths) and (auth.uid() in (o.client_id,o.artist_id) or public.is_admin())
  );
$$;
revoke all on function public.can_read_commission_file(text) from public, anon;
grant execute on function public.can_read_commission_file(text) to authenticated;

create function public.can_upload_commission_file(object_path text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_active_account() and split_part(object_path,'/',1)=auth.uid()::text and exists (
    select 1 from public.commission_orders o
    where o.id::text=split_part(object_path,'/',2) and o.artist_id=auth.uid()
      and o.status in ('in_progress','revision_requested')
  );
$$;
revoke all on function public.can_upload_commission_file(text) from public, anon;
grant execute on function public.can_upload_commission_file(text) to authenticated;

create policy commission_files_read on storage.objects for select to authenticated
using (bucket_id='commission-files' and ((storage.foldername(name))[1]=auth.uid()::text or public.can_read_commission_file(name)));
create policy commission_files_insert_guard on storage.objects as restrictive for insert to authenticated
with check (bucket_id <> 'commission-files' or public.can_upload_commission_file(name));
-- Once submitted, files cannot be overwritten or removed by the uploader.
create policy commission_files_update_guard on storage.objects as restrictive for update to authenticated
using (bucket_id <> 'commission-files') with check (bucket_id <> 'commission-files');
create policy commission_files_delete_guard on storage.objects as restrictive for delete to authenticated
using (bucket_id <> 'commission-files' or not public.can_read_commission_file(name));

create function public.submit_commission_delivery(target_order_id uuid, delivery_kind text, delivery_note text, delivery_files text[])
returns uuid language plpgsql security definer set search_path = public as $$
declare
  order_row public.commission_orders%rowtype;
  delivery_id uuid;
  next_status public.commission_status;
  file_path text;
  previous_kind text;
begin
  if not public.is_active_account() then raise exception 'active account required' using errcode='42501'; end if;
  select * into order_row from public.commission_orders where id=target_order_id for update;
  if order_row.id is null then raise exception 'commission order not found'; end if;
  if auth.uid() is distinct from order_row.artist_id then raise exception 'artist access required' using errcode='42501'; end if;
  if order_row.status not in ('in_progress','revision_requested') then raise exception 'delivery cannot be submitted in current state'; end if;
  if length(trim(coalesce(delivery_note,''))) < 10 then raise exception 'delivery note requires at least 10 characters'; end if;
  if order_row.status='revision_requested' then
    select kind into previous_kind from public.order_deliveries where order_id=target_order_id and decision='revision_requested' order by created_at desc limit 1;
    if delivery_kind is distinct from previous_kind then raise exception 'resubmit the requested delivery kind'; end if;
  end if;
  if delivery_kind='draft' then
    if exists(select 1 from public.order_deliveries where order_id=target_order_id and kind='draft' and decision='approved') then raise exception 'draft already approved'; end if;
    next_status := 'draft_review';
  elsif delivery_kind='final' then
    if not exists(select 1 from public.order_deliveries where order_id=target_order_id and kind='draft' and decision='approved') then raise exception 'approved draft required'; end if;
    if coalesce(cardinality(delivery_files),0)=0 then raise exception 'final delivery requires a file'; end if;
    next_status := 'final_review';
  else raise exception 'invalid delivery kind'; end if;
  if coalesce(cardinality(delivery_files),0)>5 then raise exception 'at most 5 delivery files'; end if;
  foreach file_path in array coalesce(delivery_files,'{}') loop
    if file_path is null or split_part(file_path,'/',1)<>auth.uid()::text or split_part(file_path,'/',2)<>target_order_id::text
      or not exists(select 1 from storage.objects where bucket_id='commission-files' and name=file_path)
    then raise exception 'invalid delivery file' using errcode='42501'; end if;
  end loop;
  insert into public.order_deliveries(order_id,submitted_by,kind,note,file_paths)
  values(target_order_id,auth.uid(),delivery_kind,delivery_note,coalesce(delivery_files,'{}')) returning id into delivery_id;
  update public.commission_orders set status=next_status,updated_at=now() where id=target_order_id;
  insert into public.order_status_logs(order_id,actor_id,from_status,to_status,note)
  values(target_order_id,auth.uid(),order_row.status,next_status,delivery_note);
  return delivery_id;
end;
$$;
revoke all on function public.submit_commission_delivery(uuid,text,text,text[]) from public, anon;
grant execute on function public.submit_commission_delivery(uuid,text,text,text[]) to authenticated;

-- Old clients can still send draft notes, but cannot bypass final attachment validation.
create or replace function public.submit_commission_delivery(target_order_id uuid, delivery_kind text, delivery_note text default null)
returns uuid language sql security definer set search_path = public as $$
  select public.submit_commission_delivery(target_order_id,delivery_kind,delivery_note,'{}'::text[]);
$$;
revoke all on function public.submit_commission_delivery(uuid,text,text) from public, anon;
grant execute on function public.submit_commission_delivery(uuid,text,text) to authenticated;

-- Serialize reviews as well as submissions so concurrent requests cannot consume revisions twice.
CREATE OR REPLACE FUNCTION public.review_commission_delivery(target_delivery_id uuid, review_decision text, review_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  delivery_row public.order_deliveries%rowtype;
  order_row public.commission_orders%rowtype;
  next_status public.commission_status;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_active_account() then raise exception 'active account required' using errcode = '42501'; end if;
  select * into delivery_row from public.order_deliveries where id = target_delivery_id for update;
  if delivery_row.id is null then raise exception 'delivery not found'; end if;
  select * into order_row from public.commission_orders where id = delivery_row.order_id for update;
  if auth.uid() is distinct from order_row.client_id and not public.is_admin() then raise exception 'client access required'; end if;
  if delivery_row.decision is not null then raise exception 'delivery already reviewed'; end if;

  if delivery_row.kind = 'draft' and order_row.status <> 'draft_review' then raise exception 'order is not waiting for draft review'; end if;
  if delivery_row.kind = 'final' and order_row.status <> 'final_review' then raise exception 'order is not waiting for final review'; end if;

  if review_decision = 'approved' then
    next_status := case when delivery_row.kind = 'draft' then 'in_progress' else 'pending_balance' end;
  elsif review_decision = 'revision_requested' then
    if order_row.revision_used >= order_row.revision_limit then raise exception 'revision limit reached'; end if;
    next_status := 'revision_requested';
  else
    raise exception 'invalid review decision';
  end if;

  update public.order_deliveries
  set decision = review_decision,
      decision_note = review_note,
      decided_by = auth.uid(),
      decided_at = now()
  where id = target_delivery_id;

  update public.commission_orders
  set status = next_status,
      revision_used = revision_used + case when review_decision = 'revision_requested' then 1 else 0 end,
      updated_at = now()
  where id = order_row.id;

  insert into public.order_status_logs (order_id, actor_id, from_status, to_status, note)
  values (order_row.id, auth.uid(), order_row.status, next_status, review_note);
end;
$function$;

notify pgrst, 'reload schema';
