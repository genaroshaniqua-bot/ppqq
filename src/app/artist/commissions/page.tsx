import { BriefcaseBusiness } from "lucide-react";
import { CommissionBackendPanel } from "@/components/commissions/CommissionBackendPanel";
import { ServicePackageManager } from "@/components/commissions/ServicePackageManager";

export default function ArtistCommissionsPage() {
  return <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><section className="rounded-[36px] bg-ink p-6 text-white shadow-soft sm:p-8"><span className="inline-flex min-h-10 items-center gap-2 rounded-pill bg-lime px-4 text-xs font-black text-ink"><BriefcaseBusiness size={16} />画师工作区</span><h1 className="mt-5 font-display text-4xl font-black sm:text-6xl">服务与委托交付</h1><p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/62">发布服务、配置套餐、响应客户需求，并按委托人审核节点提交草稿和成稿。</p></section><ServicePackageManager /><CommissionBackendPanel view="artist" /></div>;
}
