import { ShopBackendPanel } from "@/components/shop/ShopBackendPanel";
import { FeatureArtPanel } from "@/components/layout/FeatureArtPanel";
import { Download, PackageSearch, Truck } from "lucide-react";
import { TaskPathGuide } from "@/components/onboarding/TaskPathGuide";

export default function MarketPage() {
  return <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <TaskPathGuide
      title="先选交付方式，再挑喜欢的商品"
      description="商店购买不会进入约稿沟通。数字商品付款后等待文件交付；实体周边在结算时填写地址并等待物流。当前均为模拟支付。"
      paths={[
        { eyebrow: "无需收货地址", title: "购买数字商品", description: "适合素材包、设定文件与数字周边。加入购物车后可直接进入模拟支付。", steps: ["查看详情", "加入购物车", "等待文件"], href: "#shop-products", action: "浏览数字商品", icon: Download, emphasis: "dark" },
        { eyebrow: "需要配送", title: "购买实体周边", description: "适合徽章、立牌和印刷品。结算时保存收货地址，卖家发货后可查看物流。", steps: ["确认库存", "填写地址", "等待收货"], href: "#shop-products", action: "浏览实体周边", icon: Truck },
        { eyebrow: "还没想好", title: "浏览全部商品", description: "先查看封面、详情、价格和交付标签，再决定加入购物车；不会自动扣款。", steps: ["浏览分类", "查看详情", "确认结算"], href: "#shop-products", action: "进入商品区", icon: PackageSearch }
      ]}
    />
    <section className="mb-7 grid gap-5 rounded-[30px] border border-line bg-white p-5 shadow-soft lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center lg:p-6">
      <div><p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Creator market</p><h2 className="mt-2 font-display text-4xl font-black">先发现喜欢的作品，再进入结算</h2><p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-muted">浏览真实商品、查看交付类型并加入云端购物车。数字商品无需地址，实体周边仅在结算时确认配送信息。</p><div className="mt-5 flex flex-wrap gap-2"><span className="rounded-pill bg-bg px-3 py-2 text-xs font-black text-muted">1 浏览</span><span className="rounded-pill bg-bg px-3 py-2 text-xs font-black text-muted">2 购物车</span><span className="rounded-pill bg-lime px-3 py-2 text-xs font-black text-ink">3 模拟支付</span></div></div>
      <FeatureArtPanel src="/images/case-sheet.png" alt="角色设定卡、亚克力立牌、徽章与社交展示图组成的商品套装" eyebrow="数字与实体周边" caption="从角色资产到可交付文件、徽章和亚克力周边" className="min-h-[230px]" priority />
    </section>
    <ShopBackendPanel view="buyer" />
  </div>;
}
