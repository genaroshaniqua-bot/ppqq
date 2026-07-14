import { BadgeCheck, Search, ShieldCheck, Sparkles } from "lucide-react";
import { CommissionBackendPanel } from "@/components/commissions/CommissionBackendPanel";
import { FeatureArtPanel } from "@/components/layout/FeatureArtPanel";

const trustNotes = [
  { icon: BadgeCheck, label: "真实画师服务", detail: "服务、报价与交付记录均来自 Supabase" },
  { icon: ShieldCheck, label: "委托人审核", detail: "草稿与成稿由委托人确认，争议由管理员介入" },
  { icon: Sparkles, label: "反 AI 训练保护", detail: "默认不授权作品用于 AI 训练" }
];

export default function CommissionsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[36px] bg-ink px-6 py-7 text-white shadow-[0_24px_70px_rgba(18,16,22,0.16)] sm:px-8 sm:py-9">
        <div className="grid gap-7 lg:grid-cols-[1fr_0.72fr] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-lime">
              <Search size={15} aria-hidden="true" /> 找画师
            </p>
            <h1 className="mt-3 max-w-3xl font-display text-4xl font-black tracking-[-0.035em] sm:text-5xl">
              按预算、档期与授权找到合适服务
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/68 sm:text-base">
              这里仅用于委托人发现服务和管理自己的约稿；画师发布、报价与交付统一在画师工作台完成。
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            <FeatureArtPanel src="/images/artwork/silver-twins.jpg" alt="银发双人角色插画委托样例" eyebrow="委托作品预览" caption="先看画风与完成度，再比较档期、授权和报价" className="min-h-[170px] sm:col-span-3 lg:col-span-1" priority />
            {trustNotes.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-start gap-3 rounded-[18px] border border-white/10 bg-white/[0.06] px-4 py-3">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-lime text-ink">
                    <Icon size={15} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-black">{item.label}</p>
                    <p className="mt-0.5 text-xs font-semibold leading-5 text-white/56">{item.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <CommissionBackendPanel view="client" />
    </div>
  );
}
