import { ReceiptText } from "lucide-react";
import { CommissionBackendPanel } from "@/components/commissions/CommissionBackendPanel";
import { PublicRequestBoard } from "@/components/commissions/PublicRequestBoard";

export default function ProfileCommissionsPage() {
  return <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><section className="rounded-[36px] bg-ink p-6 text-white shadow-soft sm:p-8"><span className="inline-flex min-h-10 items-center gap-2 rounded-pill bg-lime px-4 text-xs font-black text-ink"><ReceiptText size={16} />个人用户</span><h1 className="mt-5 font-display text-4xl font-black sm:text-6xl">我的委托</h1><p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/62">先处理等待你的订单；需要选择公开需求收到的画师方案时，再查看下方需求区。</p></section><CommissionBackendPanel view="client" /><PublicRequestBoard view="client" /></div>;
}
