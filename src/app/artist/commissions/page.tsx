import { BriefcaseBusiness } from "lucide-react";
import { CommissionBackendPanel } from "@/components/commissions/CommissionBackendPanel";
import { ServicePackageManager } from "@/components/commissions/ServicePackageManager";
import { PublicRequestBoard } from "@/components/commissions/PublicRequestBoard";

export default function ArtistCommissionsPage() {
  return <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><section className="rounded-[36px] bg-ink p-6 text-white shadow-soft sm:p-8"><span className="inline-flex min-h-10 items-center gap-2 rounded-pill bg-lime px-4 text-xs font-black text-ink"><BriefcaseBusiness size={16} />画师工作区</span><h1 className="mt-5 font-display text-4xl font-black sm:text-6xl">委托交付与需求大厅</h1><p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/62">先完成等待你的报价与交付；有余量时，再浏览公开需求并管理服务套餐。</p></section><CommissionBackendPanel view="artist" /><PublicRequestBoard view="artist" /><ServicePackageManager /></div>;
}
