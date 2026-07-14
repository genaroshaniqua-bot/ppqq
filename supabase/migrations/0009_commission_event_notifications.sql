create or replace function public.push_commission_notification(
  target_user_id uuid,
  notification_type text,
  notification_title text,
  notification_body text,
  target_order_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_user_id is null or target_user_id = auth.uid() then return; end if;
  insert into public.notifications (user_id, type, title, body, related_order_id)
  values (target_user_id, notification_type, notification_title, notification_body, target_order_id);
end;
$$;

create or replace function public.notify_commission_request_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  artist_user_id uuid;
begin
  select artist_id into artist_user_id from public.artist_services where id = new.service_id;
  if tg_op = 'INSERT' then
    perform public.push_commission_notification(artist_user_id, 'commission_request', '收到新的约稿需求', new.title, null);
  elsif new.status is distinct from old.status then
    if new.status = 'quoted' then
      perform public.push_commission_notification(new.client_id, 'commission_quote', '画师已发送正式报价', new.title || ' · ¥' || coalesce(new.quoted_amount::text, '-'), null);
    elsif new.status = 'rejected' then
      perform public.push_commission_notification(new.client_id, 'commission_request', '约稿需求未被接受', new.title, null);
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.notify_commission_order_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  status_text text;
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    status_text := case new.status
      when 'pending_deposit' then '订单已生成，等待支付定金'
      when 'in_progress' then '订单已进入创作阶段'
      when 'draft_review' then '草稿已提交，等待审核'
      when 'revision_requested' then '委托人提出了修改要求'
      when 'final_review' then '成稿已提交，等待验收'
      when 'pending_balance' then '成稿已验收，等待支付尾款'
      when 'completed' then '订单已完成'
      when 'disputed' then '订单已进入争议处理'
      when 'cancelled' then '订单已关闭'
      else '订单状态已更新'
    end;
    perform public.push_commission_notification(new.client_id, 'commission_order', '约稿订单状态更新', status_text, new.id);
    perform public.push_commission_notification(new.artist_id, 'commission_order', '约稿订单状态更新', status_text, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists commission_request_notification on public.commission_requests;
create trigger commission_request_notification after insert or update of status on public.commission_requests
for each row execute function public.notify_commission_request_change();

drop trigger if exists commission_order_notification on public.commission_orders;
create trigger commission_order_notification after insert or update of status on public.commission_orders
for each row execute function public.notify_commission_order_change();

create or replace function public.mark_notification_read(target_notification_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications set read_at = now()
  where id = target_notification_id and user_id = auth.uid();
$$;

create or replace function public.mark_all_notifications_read()
returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications set read_at = now()
  where user_id = auth.uid() and read_at is null;
$$;

revoke all on function public.push_commission_notification(uuid, text, text, text, uuid) from public;
revoke all on function public.mark_notification_read(uuid) from public;
revoke all on function public.mark_all_notifications_read() from public;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;

