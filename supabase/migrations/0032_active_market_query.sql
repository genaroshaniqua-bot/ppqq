-- Gate the full result, not only its aggregate count.
CREATE OR REPLACE FUNCTION public.get_public_commission_market()
 RETURNS TABLE(request_id uuid, title text, brief text, service_type text, budget_min numeric, budget_max numeric, deadline date, usage_scope text, collection_ends_at timestamp with time zone, response_count bigint, lowest_quote numeric, highest_quote numeric, my_response_id uuid)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select r.id, r.title, r.brief, r.service_type, r.budget_min, r.budget_max,
    r.deadline, r.usage_scope, r.collection_ends_at,
    count(resp.id) filter (where resp.status = 'submitted' and resp.valid_until > now()),
    min(resp.quote_amount) filter (where resp.status = 'submitted' and resp.valid_until > now()),
    max(resp.quote_amount) filter (where resp.status = 'submitted' and resp.valid_until > now()),
    (array_agg(resp.id) filter (where resp.artist_id = auth.uid() and resp.status = 'submitted'))[1]
  from public.commission_requests r
  left join public.commission_responses resp on resp.request_id = r.id
  where public.is_active_account() and r.request_mode = 'public'
    and r.moderation_status in ('auto_approved', 'approved')
    and r.status in ('pending_artist', 'quoted')
    and r.collection_ends_at > now()
    and exists (select 1 from public.artist_profiles a where a.user_id = auth.uid() and a.review_status = 'approved')
  group by r.id
  order by r.created_at desc;
$function$;

