import { CircleAlert } from "lucide-react";
import { CommissionBackendPanel } from "@/components/commissions/CommissionBackendPanel";

export default function AdminDisputesPage() {
  return <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><section className="rounded-[36px] bg-ink p-6 text-white shadow-soft sm:p-8"><span className="inline-flex min-h-10 items-center gap-2 rounded-pill bg-lime px-4 text-xs font-black text-ink"><CircleAlert size={16} />管理员</span><h1 className="mt-5 font-display text-4xl font-black sm:text-6xl">委托争议处理</h1><p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/62">查看冻结订单和双方履约记录，裁定继续履约、关闭订单或执行模拟退款。</p></section><CommissionBackendPanel view="admin" /></div>;
}
