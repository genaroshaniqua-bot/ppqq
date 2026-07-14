drop policy if exists "sellers read relevant shop orders" on public.shop_orders;

create or replace function public.can_read_shop_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shop_orders shop_order
    where shop_order.id = target_order_id
      and (
        shop_order.buyer_id = auth.uid()
        or public.is_admin()
        or exists (
          select 1
          from public.shop_order_items item
          join public.products product on product.id = item.product_id
          where item.order_id = shop_order.id
            and product.seller_id = auth.uid()
        )
      )
  );
$$;

create policy "sellers read relevant shop orders"
on public.shop_orders for select
using (public.can_read_shop_order(id));

revoke all on function public.can_read_shop_order(uuid) from public;
grant execute on function public.can_read_shop_order(uuid) to authenticated;
