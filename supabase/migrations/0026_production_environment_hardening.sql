-- Production environment hardening:
-- 1. artist approval can only be changed by the reviewed admin RPC;
-- 2. only approved artists can publish marketplace supply;
-- 3. uploads have server-enforced size and MIME limits.

drop policy if exists "users manage own artist application" on public.artist_profiles;

create policy "users read own artist application"
on public.artist_profiles for select
using (
  review_status = 'approved'
  or user_id = auth.uid()
  or public.is_admin()
);

create policy "admins manage artist applications"
on public.artist_profiles for all
using (public.is_admin())
with check (public.is_admin());

revoke insert, update, delete on public.artist_profiles from anon, authenticated;
grant select on public.artist_profiles to anon, authenticated;

create or replace function public.submit_artist_application(
  application_headline text,
  application_introduction text
)
returns public.artist_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.artist_profiles;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if char_length(trim(coalesce(application_headline, ''))) < 4 then
    raise exception 'headline is too short';
  end if;
  if char_length(trim(coalesce(application_introduction, ''))) < 20 then
    raise exception 'introduction is too short';
  end if;

  insert into public.artist_profiles (
    user_id,
    headline,
    introduction,
    review_status,
    availability,
    reviewed_by,
    reviewed_at
  )
  values (
    auth.uid(),
    trim(application_headline),
    trim(application_introduction),
    'pending',
    'open',
    null,
    null
  )
  on conflict (user_id) do update
  set headline = excluded.headline,
      introduction = excluded.introduction,
      review_status = case
        when artist_profiles.review_status = 'approved' then 'approved'::public.artist_review_status
        else 'pending'::public.artist_review_status
      end,
      reviewed_by = case
        when artist_profiles.review_status = 'approved' then artist_profiles.reviewed_by
        else null
      end,
      reviewed_at = case
        when artist_profiles.review_status = 'approved' then artist_profiles.reviewed_at
        else null
      end
  returning * into result;

  return result;
end;
$$;

revoke all on function public.submit_artist_application(text, text) from public, anon;
grant execute on function public.submit_artist_application(text, text) to authenticated;

drop policy if exists "artists manage own services" on public.artist_services;
create policy "approved artists manage own services"
on public.artist_services for all
using (
  public.is_admin()
  or (
    artist_id = auth.uid()
    and exists (
      select 1 from public.artist_profiles artist
      where artist.user_id = auth.uid()
        and artist.review_status = 'approved'
    )
  )
)
with check (
  public.is_admin()
  or (
    artist_id = auth.uid()
    and exists (
      select 1 from public.artist_profiles artist
      where artist.user_id = auth.uid()
        and artist.review_status = 'approved'
    )
  )
);

drop policy if exists "artists manage own portfolios" on public.portfolios;
create policy "approved artists manage own portfolios"
on public.portfolios for all
using (
  public.is_admin()
  or (
    artist_id = auth.uid()
    and exists (
      select 1 from public.artist_profiles artist
      where artist.user_id = auth.uid()
        and artist.review_status = 'approved'
    )
  )
)
with check (
  public.is_admin()
  or (
    artist_id = auth.uid()
    and exists (
      select 1 from public.artist_profiles artist
      where artist.user_id = auth.uid()
        and artist.review_status = 'approved'
    )
  )
);

drop policy if exists "sellers manage products" on public.products;
create policy "approved artists manage products"
on public.products for all
using (
  public.is_admin()
  or (
    seller_id = auth.uid()
    and exists (
      select 1 from public.artist_profiles artist
      where artist.user_id = auth.uid()
        and artist.review_status = 'approved'
    )
  )
)
with check (
  public.is_admin()
  or (
    seller_id = auth.uid()
    and exists (
      select 1 from public.artist_profiles artist
      where artist.user_id = auth.uid()
        and artist.review_status = 'approved'
    )
  )
);

update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'avatars';

update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in ('portfolios', 'product-media');

update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/zip'
    ]
where id = 'commission-files';

drop policy if exists "users manage own media" on storage.objects;
create policy "users update own media"
on storage.objects for update
using (
  bucket_id in ('avatars', 'portfolios', 'product-media', 'commission-files')
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id in ('avatars', 'portfolios', 'product-media', 'commission-files')
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "users delete own media"
on storage.objects for delete
using (
  bucket_id in ('avatars', 'portfolios', 'product-media', 'commission-files')
  and (storage.foldername(name))[1] = auth.uid()::text
);
