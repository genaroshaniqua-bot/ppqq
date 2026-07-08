import Link from "next/link";
import { Check, Coins, Sparkles } from "lucide-react";
import { pricingPlans } from "@/data/mock-generations";

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-8 rounded-[36px] bg-ink p-6 text-white shadow-soft md:p-10">
        <p className="text-xs font-black uppercase text-lime">Pricing</p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-black md:text-6xl">按创作量升级，不把前端原型做成支付系统。</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-white/72">当前阶段只展示商业模式：免费版、会员、点数、单次项目。后续再接真实登录、支付和点数消耗。</p>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {pricingPlans.map((plan, index) => (
          <article key={plan.name} className={`rounded-card border border-line bg-white p-5 shadow-soft ${index === 2 ? "ring-4 ring-primary/30" : ""}`}>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-black">{plan.name}</h2>
                <p className="mt-1 text-sm font-semibold text-muted">{plan.desc}</p>
              </div>
              <span className={`grid size-11 place-items-center rounded-pill ${index === 2 ? "bg-lime" : "bg-bg"}`}>
                {index === 2 ? <Sparkles size={19} aria-hidden="true" /> : <Coins size={19} aria-hidden="true" />}
              </span>
            </div>
            <p className="font-display text-4xl font-black">{plan.price}</p>
            <ul className="mt-6 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-3 text-sm font-semibold leading-6 text-muted">
                  <Check className="mt-0.5 shrink-0 text-primary" size={17} aria-hidden="true" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/create"
              className={`mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-pill px-5 text-sm font-black transition ${
                index === 2 ? "bg-ink text-white hover:bg-primary hover:text-ink" : "bg-bg text-ink hover:bg-primary/15"
              }`}
            >
              进入创作
            </Link>
          </article>
        ))}
      </section>

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
