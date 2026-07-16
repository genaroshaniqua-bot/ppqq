import { BriefcaseBusiness } from "lucide-react";
import { CommissionBackendPanel } from "@/components/commissions/CommissionBackendPanel";
import { ServicePackageManager } from "@/components/commissions/ServicePackageManager";
import { PublicRequestBoard } from "@/components/commissions/PublicRequestBoard";

export default function ArtistCommissionsPage() {
  return <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><section className="rounded-[36px] bg-ink p-6 text-white shadow-soft sm:p-8"><span className="inline-flex min-h-10 items-center gap-2 rounded-pill bg-lime px-4 text-xs font-black text-ink"><BriefcaseBusiness size={16} />画师工作区</span><h1 className="mt-5 font-display text-4xl font-black sm:text-6xl">需求大厅与委托交付</h1><p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/62">关联有效服务和套餐响应公开需求，并继续处理指定邀请、草稿和成稿交付。</p></section><PublicRequestBoard view="artist" /><ServicePackageManager /><CommissionBackendPanel view="artist" /></div>;
}
