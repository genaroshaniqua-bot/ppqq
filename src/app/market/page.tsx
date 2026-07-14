import { ShopBackendPanel } from "@/components/shop/ShopBackendPanel";
import { FeatureArtPanel } from "@/components/layout/FeatureArtPanel";

export default function MarketPage() {
  return <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <section className="mb-7 grid gap-5 rounded-[30px] border border-line bg-white p-5 shadow-soft lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center lg:p-6">
      <div><p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Creator market</p><h1 className="mt-2 font-display text-4xl font-black">先发现喜欢的作品，再进入结算</h1><p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-muted">浏览真实商品、查看交付类型并加入云端购物车。数字商品无需地址，实体周边仅在结算时确认配送信息。</p><div className="mt-5 flex flex-wrap gap-2"><span className="rounded-pill bg-bg px-3 py-2 text-xs font-black text-muted">1 浏览</span><span className="rounded-pill bg-bg px-3 py-2 text-xs font-black text-muted">2 购物车</span><span className="rounded-pill bg-lime px-3 py-2 text-xs font-black text-ink">3 模拟支付</span></div></div>
      <FeatureArtPanel src="/images/case-sheet.png" alt="角色设定卡、亚克力立牌、徽章与社交展示图组成的商品套装" eyebrow="数字与实体周边" caption="从角色资产到可交付文件、徽章和亚克力周边" className="min-h-[230px]" priority />
    </section>
    <ShopBackendPanel view="buyer" />
  </div>;
}
