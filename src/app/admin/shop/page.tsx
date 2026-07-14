import { ShoppingBag } from "lucide-react";
import { ShopBackendPanel } from "@/components/shop/ShopBackendPanel";

export default function AdminShopPage() {
  return <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><section className="mb-7 rounded-[36px] border border-line bg-white p-6 shadow-soft sm:p-8"><span className="inline-flex min-h-10 items-center gap-2 rounded-pill bg-primary/12 px-4 text-xs font-black text-primary"><ShoppingBag size={16} />管理员</span><h1 className="mt-5 font-display text-4xl font-black sm:text-6xl">商品与订单治理</h1><p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-muted">检查商品上下架、订单履约和模拟退款状态。</p></section><ShopBackendPanel view="admin" /></div>;
}
