import { pricingPlans } from "@/data/mock-generations";
import { FeatureArtPanel } from "@/components/layout/FeatureArtPanel";
import { PricingPurchasePanel } from "@/components/pricing/PricingPurchasePanel";

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-8 grid gap-7 rounded-[36px] bg-ink p-6 text-white shadow-soft md:p-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center">
        <div><p className="text-xs font-black uppercase text-lime">Pricing</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-black md:text-6xl">按创作量选择合适的会员方案。</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/72">当前会员与点数用于展示权益结构；商品和委托交易统一采用模拟支付，不会连接银行卡或第三方支付渠道。</p>
        </div>
        <FeatureArtPanel src="/images/pricing-membership-studio.png" alt="阳光工作室里使用数位屏创作原创角色的画师" eyebrow="会员创作空间" caption="让持续生成、保存和导出围绕同一份角色资产发生" className="min-h-[230px]" />
      </section>

      <PricingPurchasePanel plans={pricingPlans} />

      <section className="mt-8 grid gap-5 md:grid-cols-3">
        {[
          ["OC 人设生成", "12 点/次", "完整人设、角色卡摘要、后续建议。"],
          ["头像提示词", "8 点/次", "构图、光线、服装、负面提示。"],
          ["摊宣套装", "20 点/次", "文案、商品菜单和价格牌组合。"]
        ].map(([title, price, desc]) => (
          <article key={title} className="rounded-card border border-line bg-white p-5 shadow-soft">
            <p className="text-xs font-black uppercase text-primary">Credit Rule</p>
            <h2 className="mt-2 font-display text-2xl font-black">{title}</h2>
            <p className="mt-2 text-xl font-black">{price}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{desc}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
