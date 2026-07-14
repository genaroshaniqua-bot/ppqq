import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Brush, Images, MessageSquareText, PackageOpen, Plus, Store, WandSparkles } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FeatureArtPanel } from "@/components/layout/FeatureArtPanel";

export default async function ArtistDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: services, count: serviceCount } = await supabase
    .from("artist_services")
    .select("id", { count: "exact" })
    .eq("artist_id", user.id);
  const serviceIds = services?.map((service) => service.id) ?? [];

  const [requestsResult, ordersResult, productsResult] = await Promise.all([
    serviceIds.length > 0
      ? supabase.from("commission_requests").select("id", { count: "exact", head: true }).in("service_id", serviceIds).eq("status", "pending_artist")
      : Promise.resolve({ count: 0 }),
    supabase.from("commission_orders").select("id", { count: "exact", head: true }).eq("artist_id", user.id).not("status", "in", "(completed,cancelled)"),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("seller_id", user.id).eq("is_active", true)
  ]);

  const pendingRequests = requestsResult.count ?? 0;
  const activeOrders = ordersResult.count ?? 0;
  const activeProducts = productsResult.count ?? 0;
  const tasks = [
    {
      href: "/artist/commissions",
      label: "待响应需求",
      value: pendingRequests,
      detail: pendingRequests > 0 ? "优先确认需求范围、档期并发送报价" : "目前没有等待报价的新需求",
      icon: MessageSquareText,
      priority: pendingRequests > 0
    },
    {
      href: "/artist/commissions",
      label: "进行中委托",
      value: activeOrders,
      detail: activeOrders > 0 ? "检查草稿、修改请求与最终交付节点" : "暂无需要交付的委托",
      icon: BriefcaseBusiness,
      priority: activeOrders > 0
    },
    {
      href: "/artist/products",
      label: "在售商品",
      value: activeProducts,
      detail: activeProducts > 0 ? "查看商品状态和待履约订单" : "发布第一件数字商品或实体周边",
      icon: PackageOpen,
      priority: false
    }
  ];
  const actions = [
    { href: "/artist/commissions", title: "服务与委托", desc: "发布服务、处理报价和交付。", icon: Brush },
    { href: "/artist/portfolio", title: "维护作品集", desc: "更新代表作和创作标签。", icon: Images },
    { href: "/artist/products", title: "经营商品", desc: "管理商品、履约与退款。", icon: Store },
    { href: "/studio", title: "AI 创作辅助", desc: "用角色资产准备创作素材。", icon: WandSparkles }
  ];

  return (
    <div className="mx-auto min-h-[calc(100dvh-5rem)] max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
      <header className="grid gap-5 rounded-[30px] border border-line bg-white p-5 shadow-soft sm:p-6 lg:grid-cols-[minmax(0,1fr)_280px_auto] lg:items-center">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-primary"><Brush size={16} aria-hidden="true" />画师工作台</p>
          <h1 className="mt-2 font-display text-3xl font-black tracking-[-0.03em] sm:text-4xl">先处理今天最重要的创作节点</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-muted">报价、交付和履约集中在这里；个人购买记录仍保留在同一账户中。</p>
        </div>
        <FeatureArtPanel src="/images/hero-workbench.png" alt="画师工作台上的角色设计稿、交付文件与周边样品" eyebrow="画师工作现场" caption="报价、创作、交付与作品沉淀围绕同一套素材推进" className="min-h-[170px]" />
        <div className="flex flex-wrap gap-2">
          <Link href="/artist/commissions" className="inline-flex min-h-11 items-center gap-2 rounded-pill bg-lime px-4 text-sm font-black text-ink"><Plus size={16} aria-hidden="true" />发布服务</Link>
          <Link href="/profile" className="inline-flex min-h-11 items-center rounded-pill border border-line bg-bg px-4 text-sm font-black text-ink">切换身份</Link>
        </div>
      </header>

      <section className="mt-5" aria-labelledby="artist-tasks-heading">
        <div className="flex items-end justify-between gap-3">
          <div><p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Today</p><h2 id="artist-tasks-heading" className="mt-1 font-display text-2xl font-black">今日待办</h2></div>
          <p className="text-xs font-bold text-muted">数字来自真实订单状态</p>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {tasks.map((task) => {
            const Icon = task.icon;
            return (
              <Link key={task.label} href={task.href} className={`group rounded-card border p-5 transition hover:-translate-y-0.5 hover:shadow-soft ${task.priority ? "border-lime bg-ink text-white" : "border-line bg-white text-ink"}`}>
                <div className="flex items-start justify-between gap-3">
                  <span className={`grid size-11 place-items-center rounded-full ${task.priority ? "bg-lime text-ink" : "bg-bg text-primary"}`}><Icon size={20} aria-hidden="true" /></span>
                  <span className="font-display text-4xl font-black">{task.value}</span>
                </div>
                <p className="mt-5 text-base font-black">{task.label}</p>
                <p className={`mt-1 text-sm font-semibold leading-6 ${task.priority ? "text-white/62" : "text-muted"}`}>{task.detail}</p>
                <span className={`mt-4 inline-flex items-center gap-1 text-xs font-black ${task.priority ? "text-lime" : "text-primary"}`}>进入处理 <ArrowRight size={14} className="transition group-hover:translate-x-1" aria-hidden="true" /></span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2" aria-label="画师经营概况">
        <article className="flex items-center justify-between rounded-[20px] border border-line bg-white px-5 py-4"><div><p className="text-xs font-bold text-muted">已发布服务</p><p className="mt-1 font-display text-3xl font-black">{serviceCount ?? 0}</p></div><Brush className="text-primary" aria-hidden="true" /></article>
        <article className="flex items-center justify-between rounded-[20px] border border-line bg-white px-5 py-4"><div><p className="text-xs font-bold text-muted">当前工作负载</p><p className="mt-1 text-sm font-black">{activeOrders > 0 ? `${activeOrders} 笔委托进行中` : "档期可开放"}</p></div><BriefcaseBusiness className="text-purple" aria-hidden="true" /></article>
      </section>

      <section className="mt-7">
        <h2 className="font-display text-2xl font-black">工作入口</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {actions.map((action) => {
            const Icon = action.icon;
            return <Link key={action.href} href={action.href} className="group flex items-center gap-4 rounded-[20px] border border-line bg-white p-4 transition hover:border-primary"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-bg text-ink transition group-hover:bg-lime"><Icon size={19} aria-hidden="true" /></span><span><strong className="block text-sm font-black">{action.title}</strong><span className="mt-1 block text-xs font-semibold leading-5 text-muted">{action.desc}</span></span></Link>;
          })}
        </div>
      </section>
    </div>
  );
}
