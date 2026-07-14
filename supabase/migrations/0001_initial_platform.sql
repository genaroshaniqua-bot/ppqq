create extension if not exists "pgcrypto";

create type public.platform_role as enum ('user', 'artist', 'admin');
create type public.artist_review_status as enum ('draft', 'pending', 'approved', 'rejected');
create type public.commission_status as enum (
  'pending_artist', 'pending_quote', 'pending_deposit', 'in_progress',
  'draft_review', 'revision_requested', 'final_review', 'pending_balance',
  'completed', 'cancelled', 'disputed'
);
create type public.payment_status as enum ('unpaid', 'pending', 'paid', 'failed', 'refunding', 'refunded');
create type public.product_kind as enum ('digital', 'physical', 'custom');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '新用户',
  avatar_url text,
  bio text,
  role public.platform_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.artist_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  headline text,
  introduction text,
  review_status public.artist_review_status not null default 'draft',
  availability text not null default 'open',
  response_time_hours integer,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.artist_services (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artist_profiles(user_id) on delete cascade,
  title text not null,
  description text not null,
  service_type text not null,
  base_price numeric(12, 2) not null check (base_price >= 0),
  revision_limit integer not null default 2 check (revision_limit >= 0),
  delivery_days integer not null check (delivery_days > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.portfolios (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artist_profiles(user_id) on delete cascade,
  title text not null,
  image_url text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  summary text,
  profile jsonb not null default '{}',
  cover_url text,
  visibility text not null default 'private' check (visibility in ('private', 'unlisted', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  character_id uuid references public.characters(id) on delete set null,
  generation_type text not null,
  prompt jsonb not null default '{}',
  result jsonb,
  status text not null default 'pending' check (status in ('pending', 'running', 'succeeded', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

create table public.commission_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id),
  service_id uuid references public.artist_services(id),
  character_id uuid references public.characters(id),
  title text not null,
  brief text not null,
  budget_min numeric(12, 2),
  budget_max numeric(12, 2),
  deadline date,
  usage_scope text not null default 'personal',
  allow_public_display boolean not null default false,
  allow_ai_training boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.commission_orders (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.commission_requests(id),
  client_id uuid not null references public.profiles(id),
  artist_id uuid not null references public.artist_profiles(user_id),
  status public.commission_status not null default 'pending_artist',
  quoted_amount numeric(12, 2),
  deposit_amount numeric(12, 2),
  balance_amount numeric(12, 2),
  deposit_status public.payment_status not null default 'unpaid',
  balance_status public.payment_status not null default 'unpaid',
  revision_limit integer not null default 2,
  revision_used integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.commission_orders(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id),
  kind text not null check (kind in ('draft', 'final')),
  file_urls text[] not null default '{}',
  note text,
  decision text check (decision in ('approved', 'revision_requested')),
  decision_note text,
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.order_status_logs (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.commission_orders(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  from_status public.commission_status,
  to_status public.commission_status not null,
  note text,
  created_at timestamptz not null default now()
);

create table public.order_disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.commission_orders(id),
  opened_by uuid not null references public.profiles(id),
  reason text not null,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved')),
  resolution text,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id),
  title text not null,
  description text not null,
  kind public.product_kind not null,
  price numeric(12, 2) not null check (price >= 0),
  cover_url text,
  stock integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id),
  amount numeric(12, 2) not null check (amount >= 0),
  payment_status public.payment_status not null default 'unpaid',
  fulfillment_status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.shop_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  commission_order_id uuid references public.commission_orders(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null,
  attachment_urls text[] not null default '{}',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

alter table public.profiles enable row level security;
alter table public.artist_profiles enable row level security;
alter table public.artist_services enable row level security;
alter table public.portfolios enable row level security;
alter table public.characters enable row level security;
alter table public.ai_generations enable row level security;
alter table public.commission_requests enable row level security;
alter table public.commission_orders enable row level security;
alter table public.order_deliveries enable row level security;
alter table public.order_status_logs enable row level security;
alter table public.order_disputes enable row level security;
alter table public.products enable row level security;
alter table public.shop_orders enable row level security;
alter table public.shop_order_items enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

create policy "public profiles are readable" on public.profiles for select using (true);
create policy "users update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
revoke update on table public.profiles from authenticated;
grant update (display_name, avatar_url, bio, updated_at) on table public.profiles to authenticated;
create policy "approved artists are readable" on public.artist_profiles for select using (review_status = 'approved' or auth.uid() = user_id or public.is_admin());
create policy "users manage own artist application" on public.artist_profiles for all using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());
create policy "active services are readable" on public.artist_services for select using (is_active or auth.uid() = artist_id or public.is_admin());
create policy "artists manage own services" on public.artist_services for all using (auth.uid() = artist_id or public.is_admin()) with check (auth.uid() = artist_id or public.is_admin());
create policy "portfolios are readable" on public.portfolios for select using (true);
create policy "artists manage own portfolios" on public.portfolios for all using (auth.uid() = artist_id or public.is_admin()) with check (auth.uid() = artist_id or public.is_admin());
create policy "owners manage characters" on public.characters for all using (auth.uid() = owner_id or public.is_admin()) with check (auth.uid() = owner_id or public.is_admin());
create policy "public characters are readable" on public.characters for select using (visibility = 'public' or auth.uid() = owner_id or public.is_admin());
create policy "owners manage generations" on public.ai_generations for all using (auth.uid() = owner_id or public.is_admin()) with check (auth.uid() = owner_id or public.is_admin());
create policy "clients manage requests" on public.commission_requests for all using (auth.uid() = client_id or public.is_admin()) with check (auth.uid() = client_id or public.is_admin());
create policy "order parties read orders" on public.commission_orders for select using (auth.uid() in (client_id, artist_id) or public.is_admin());
create policy "order parties update orders" on public.commission_orders for update using (auth.uid() in (client_id, artist_id) or public.is_admin());
create policy "order parties read deliveries" on public.order_deliveries for select using (exists(select 1 from public.commission_orders o where o.id = order_id and auth.uid() in (o.client_id, o.artist_id)) or public.is_admin());
create policy "artists submit deliveries" on public.order_deliveries for insert with check (auth.uid() = submitted_by and exists(select 1 from public.commission_orders o where o.id = order_id and auth.uid() = o.artist_id));
create policy "order parties read logs" on public.order_status_logs for select using (exists(select 1 from public.commission_orders o where o.id = order_id and auth.uid() in (o.client_id, o.artist_id)) or public.is_admin());
create policy "order parties create disputes" on public.order_disputes for insert with check (auth.uid() = opened_by and exists(select 1 from public.commission_orders o where o.id = order_id and auth.uid() in (o.client_id, o.artist_id)));
create policy "order parties read disputes" on public.order_disputes for select using (exists(select 1 from public.commission_orders o where o.id = order_id and auth.uid() in (o.client_id, o.artist_id)) or public.is_admin());
create policy "active products are readable" on public.products for select using (is_active or auth.uid() = seller_id or public.is_admin());
create policy "sellers manage products" on public.products for all using (auth.uid() = seller_id or public.is_admin()) with check (auth.uid() = seller_id or public.is_admin());
create policy "buyers manage shop orders" on public.shop_orders for all using (auth.uid() = buyer_id or public.is_admin()) with check (auth.uid() = buyer_id or public.is_admin());
create policy "buyers read order items" on public.shop_order_items for select using (exists(select 1 from public.shop_orders o where o.id = order_id and auth.uid() = o.buyer_id) or public.is_admin());
create policy "members read conversations" on public.conversations for select using (exists(select 1 from public.conversation_members m where m.conversation_id = id and m.user_id = auth.uid()) or public.is_admin());
create policy "members read memberships" on public.conversation_members for select using (user_id = auth.uid() or public.is_admin());
create policy "members read messages" on public.messages for select using (exists(select 1 from public.conversation_members m where m.conversation_id = conversation_id and m.user_id = auth.uid()) or public.is_admin());
create policy "members send messages" on public.messages for insert with check (sender_id = auth.uid() and exists(select 1 from public.conversation_members m where m.conversation_id = conversation_id and m.user_id = auth.uid()));

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('portfolios', 'portfolios', true), ('commission-files', 'commission-files', false)
on conflict (id) do nothing;

create policy "public reads public media" on storage.objects for select using (bucket_id in ('avatars', 'portfolios'));
create policy "users upload own media" on storage.objects for insert with check (bucket_id in ('avatars', 'portfolios', 'commission-files') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users manage own media" on storage.objects for all using ((storage.foldername(name))[1] = auth.uid()::text) with check ((storage.foldername(name))[1] = auth.uid()::text);
