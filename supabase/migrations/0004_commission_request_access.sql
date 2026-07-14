create policy "artists read requests for own services"
on public.commission_requests
for select
using (
  exists (
    select 1
    from public.artist_services service
    where service.id = commission_requests.service_id
      and service.artist_id = auth.uid()
  )
  or public.is_admin()
);

