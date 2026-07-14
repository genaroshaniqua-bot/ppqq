import { ShoppingBag } from "lucide-react";
import { ShopBackendPanel } from "@/components/shop/ShopBackendPanel";

export default function ProfileOrdersPage() {
  return <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><section className="mb-7 rounded-[36px] border border-line bg-white p-6 shadow-soft sm:p-8"><span className="inline-flex min-h-10 items-center gap-2 rounded-pill bg-primary/12 px-4 text-xs font-black text-primary"><ShoppingBag size={16} />个人用户</span><h1 className="mt-5 font-display text-4xl font-black sm:text-6xl">商品订单</h1><p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-muted">查看模拟付款、数字交付、物流信息、确认收货和退款状态。</p></section><ShopBackendPanel view="buyer-orders" /></div>;
}
