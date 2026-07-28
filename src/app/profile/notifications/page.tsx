import { Bell } from "lucide-react";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

export default function ProfileNotificationsPage() {
  return <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8"><section className="mb-7 rounded-[36px] bg-ink p-6 text-white shadow-soft sm:p-8"><span className="inline-flex min-h-10 items-center gap-2 rounded-pill bg-lime px-4 text-xs font-black text-ink"><Bell size={16} />Important inbox</span><h1 className="mt-5 font-display text-4xl font-black sm:text-6xl">重要消息</h1><p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/62">仅保留委托沟通、报价、交付、审核、争议和商品履约等需要你采取行动的通知。</p></section><NotificationCenter /></div>;
}
