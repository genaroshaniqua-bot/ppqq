-- Record explicit acceptance of the active agreement version.

create or replace function public.accept_legal_document(target_document_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not exists (
    select 1 from public.legal_documents
    where id = target_document_id and is_active
  ) then
    raise exception 'active legal document not found';
  end if;

  insert into public.legal_consents (user_id, document_id, accepted_at, withdrawn_at)
  values (auth.uid(), target_document_id, now(), null)
  on conflict (user_id, document_id) do update
  set accepted_at = excluded.accepted_at,
      withdrawn_at = null;
end;
$$;

revoke execute on function public.accept_legal_document(uuid) from public, anon;
grant execute on function public.accept_legal_document(uuid) to authenticated;
