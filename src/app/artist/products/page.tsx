import { Store } from "lucide-react";
import { ShopBackendPanel } from "@/components/shop/ShopBackendPanel";

export default function ArtistProductsPage() {
  return <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><section className="mb-7 rounded-[36px] border border-line bg-white p-6 shadow-soft sm:p-8"><span className="inline-flex min-h-10 items-center gap-2 rounded-pill bg-purple/10 px-4 text-xs font-black text-purple"><Store size={16} />画师工作区</span><h1 className="mt-5 font-display text-4xl font-black sm:text-6xl">商品与履约</h1><p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-muted">发布数字商品或实体周边，管理上下架，并完成私有文件交付或物流履约。</p></section><ShopBackendPanel view="seller" /></div>;
}
