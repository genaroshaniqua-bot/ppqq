import Link from "next/link";
import { ArrowRight, BadgeCheck, Boxes, BriefcaseBusiness, CircleAlert, ClipboardCheck, FileClock, PackageCheck, ShieldCheck, ShoppingBag, UsersRound } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FeatureArtPanel } from "@/components/layout/FeatureArtPanel";

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const [users, pendingArtists, services, products, commissionOrders, shopOrders, disputes] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("artist_profiles").select("user_id", { count: "exact", head: true }).eq("review_status", "pending"),
    supabase.from("artist_services").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("commission_orders").select("id", { count: "exact", head: true }),
    supabase.from("shop_orders").select("id", { count: "exact", head: true }),
    supabase.from("order_disputes").select("id", { count: "exact", head: true }).neq("status", "resolved")
  ]);

  const riskQueue = [
    { href: "/admin/disputes", label: "待处理争议", value: disputes.count ?? 0, detail: "核对双方材料并给出继续履约、退款或关闭裁定", icon: CircleAlert, urgent: (disputes.count ?? 0) > 0 },
    { href: "/admin/artists", label: "画师入驻审核", value: pendingArtists.count ?? 0, detail: "检查入驻资料、服务定位和账户状态", icon: BadgeCheck, urgent: (pendingArtists.count ?? 0) > 0 },
    { href: "/admin/services", label: "服务内容巡检", value: services.count ?? 0, detail: "查看在售服务并处理异常定价或描述", icon: ClipboardCheck, urgent: false }
  ];
  const metrics = [
    { label: "平台用户", value: users.count ?? 0, icon: UsersRound },
    { label: "在售商品", value: products.count ?? 0, icon: Boxes },
    { label: "委托订单", value: commissionOrders.count ?? 0, icon: PackageCheck },
    { label: "商城订单", value: shopOrders.count ?? 0, icon: ShoppingBag }
  ];
  const tools = [
    { href: "/admin/users", title: "用户与权限", detail: "角色、账号状态和风险变更", icon: UsersRound },
    { href: "/admin/services", title: "画师服务审核", detail: "服务说明、定价与下架记录", icon: BriefcaseBusiness },
    { href: "/admin/shop", title: "商品与商城订单", detail: "商品、履约和模拟退款", icon: ShoppingBag },
    { href: "/admin/audit", title: "操作审计", detail: "管理员操作与治理记录", icon: FileClock }
  ];

  return (
    <div className="mx-auto min-h-[calc(100dvh-5rem)] max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
      <header className="grid gap-5 rounded-[30px] border border-line bg-white p-5 shadow-soft sm:p-6 lg:grid-cols-[minmax(0,1fr)_260px_auto] lg:items-center">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-primary"><ShieldCheck size={16} aria-hidden="true" />管理员工作台</p>
          <h1 className="mt-2 font-display text-3xl font-black tracking-[-0.03em] sm:text-4xl">先处理风险，再查看平台规模</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-muted">管理员身份由账户权限自动识别，不参与个人用户与画师身份切换。</p>
        </div>
        <FeatureArtPanel src="/images/case-sheet.png" alt="用于平台审核的角色设定、作品展示和周边样品资料" eyebrow="治理资料视图" caption="审核服务、作品、授权和交易记录时保留创作上下文" className="min-h-[160px]" />
        <Link href="/admin/audit" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-pill bg-ink px-4 text-sm font-black text-white">查看审计记录 <ArrowRight size={15} aria-hidden="true" /></Link>
      </header>

      <section className="mt-5" aria-labelledby="risk-queue-heading">
        <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Risk queue</p><h2 id="risk-queue-heading" className="mt-1 font-display text-2xl font-black">待处理队列</h2></div><p className="text-xs font-bold text-muted">按治理优先级排列</p></div>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {riskQueue.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.label} href={item.href} className={`group rounded-card border p-5 transition hover:-translate-y-0.5 hover:shadow-soft ${item.urgent ? "border-lime bg-ink text-white" : "border-line bg-white text-ink"}`}>
                <div className="flex items-start justify-between gap-3"><span className={`grid size-11 place-items-center rounded-full ${item.urgent ? "bg-lime text-ink" : "bg-bg text-primary"}`}><Icon size={20} aria-hidden="true" /></span><span className="font-display text-4xl font-black">{item.value}</span></div>
                <p className="mt-5 text-base font-black">{item.label}</p>
                <p className={`mt-1 text-sm font-semibold leading-6 ${item.urgent ? "text-white/62" : "text-muted"}`}>{item.detail}</p>
                <span className={`mt-4 inline-flex items-center gap-1 text-xs font-black ${item.urgent ? "text-lime" : "text-primary"}`}>进入处理 <ArrowRight size={14} className="transition group-hover:translate-x-1" aria-hidden="true" /></span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="平台数据概况">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return <article key={metric.label} className="flex items-center justify-between rounded-[20px] border border-line bg-white px-5 py-4"><div><p className="text-xs font-bold text-muted">{metric.label}</p><p className="mt-1 font-display text-3xl font-black">{metric.value}</p></div><span className="grid size-10 place-items-center rounded-full bg-bg text-primary"><Icon size={18} aria-hidden="true" /></span></article>;
        })}
      </section>

      <section className="mt-7">
        <h2 className="font-display text-2xl font-black">管理工具</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return <Link key={tool.href} href={tool.href} className="group flex items-center gap-4 rounded-[20px] border border-line bg-white p-4 transition hover:border-primary"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-bg text-ink transition group-hover:bg-lime"><Icon size={19} aria-hidden="true" /></span><span><strong className="block text-sm font-black">{tool.title}</strong><span className="mt-1 block text-xs font-semibold leading-5 text-muted">{tool.detail}</span></span></Link>;
          })}
        </div>
      </section>
    </div>
  );
}
