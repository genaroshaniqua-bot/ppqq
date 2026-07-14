create table if not exists public.cart_items (
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0 and quantity <= 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.cart_items enable row level security;
create policy "users manage own cart" on public.cart_items for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "buyers insert order items" on public.shop_order_items for insert
with check (exists(select 1 from public.shop_orders o where o.id = order_id and o.buyer_id = auth.uid()) or public.is_admin());

create or replace function public.set_cart_quantity(target_product_id uuid, target_quantity integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare product_row public.products%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into product_row from public.products where id = target_product_id and is_active = true;
  if product_row.id is null then raise exception 'product is unavailable'; end if;
  if target_quantity <= 0 then
    delete from public.cart_items where user_id = auth.uid() and product_id = target_product_id;
    return;
  end if;
  if target_quantity > 99 or (product_row.stock is not null and target_quantity > product_row.stock) then raise exception 'insufficient stock'; end if;
  insert into public.cart_items (user_id, product_id, quantity)
  values (auth.uid(), target_product_id, target_quantity)
  on conflict (user_id, product_id) do update set quantity = excluded.quantity, updated_at = now();
end;
$$;

create or replace function public.checkout_shop_cart()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_order_id uuid;
  total_amount numeric(12,2);
  invalid_count integer;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  perform 1 from public.products p join public.cart_items c on c.product_id = p.id
  where c.user_id = auth.uid() for update of p;
  select count(*) into invalid_count from public.cart_items c join public.products p on p.id = c.product_id
  where c.user_id = auth.uid() and (not p.is_active or (p.stock is not null and p.stock < c.quantity));
  if invalid_count > 0 then raise exception 'cart contains unavailable or insufficient stock products'; end if;
  select sum(p.price * c.quantity) into total_amount from public.cart_items c join public.products p on p.id = c.product_id where c.user_id = auth.uid();
  if total_amount is null then raise exception 'cart is empty'; end if;

  insert into public.shop_orders (buyer_id, amount, payment_status, fulfillment_status)
  values (auth.uid(), total_amount, 'paid', 'processing') returning id into new_order_id;
  insert into public.shop_order_items (order_id, product_id, quantity, unit_price)
  select new_order_id, p.id, c.quantity, p.price from public.cart_items c join public.products p on p.id = c.product_id where c.user_id = auth.uid();
  update public.products p set stock = p.stock - c.quantity
  from public.cart_items c where c.user_id = auth.uid() and c.product_id = p.id and p.stock is not null;
  delete from public.cart_items where user_id = auth.uid();
  insert into public.notifications (user_id, type, title, body)
  values (auth.uid(), 'shop_order', '商品订单模拟支付成功', '订单 ' || left(new_order_id::text, 8) || ' · ¥' || total_amount::text);
  return new_order_id;
end;
$$;

revoke all on function public.set_cart_quantity(uuid, integer) from public;
revoke all on function public.checkout_shop_cart() from public;
grant execute on function public.set_cart_quantity(uuid, integer) to authenticated;
grant execute on function public.checkout_shop_cart() to authenticated;

do $$
declare admin_id uuid;
begin
  select id into admin_id from public.profiles where role = 'admin' order by created_at limit 1;
  if admin_id is null then return; end if;
  insert into public.products (seller_id, title, description, kind, price, stock)
  select admin_id, seed.title, seed.description, seed.kind::public.product_kind, seed.price, seed.stock
  from (values
    ('月光社团头像提示词套装', '包含 12 组头像方向、3 种光线模板和可复制负面提示词。', 'digital', 18::numeric, null::integer),
    ('星屑角色卡排版模板', '横版与竖版角色卡、标签组件，适合 OC 设定集展示。', 'digital', 26::numeric, null::integer),
    ('雨夜异能徽章预览包', '3 枚表情差分、代表色建议与背卡文案。', 'physical', 12::numeric, 50::integer),
    ('废土偶像立牌方向', '角色动作剪影、透明底座和包装标签设计方向。', 'physical', 35::numeric, 20::integer)
  ) as seed(title, description, kind, price, stock)
  where not exists (select 1 from public.products p where p.title = seed.title);
end;
$$;

