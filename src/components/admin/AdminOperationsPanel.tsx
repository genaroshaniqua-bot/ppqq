"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, DatabaseBackup, Headphones, LoaderCircle, RefreshCw, Server } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Health = { status: string; checkedAt: string; services: { application: string; database: string }; databaseLatencyMs?: number };
type Event = { id: string; severity: string; source: string; event_code: string; message: string; route: string | null; created_at: string };
type Ticket = { id: string; user_id: string; category: string; priority: string; subject: string; description: string; status: string; created_at: string };
type RecoveryRun = { id: string; scenario: string; status: string; environment: string; rpo_minutes: number | null; rto_minutes: number | null; notes: string; created_at: string };

const ticketStatusLabels: Record<string, string> = { open: "待受理", in_progress: "处理中", waiting_user: "待用户补充", resolved: "已解决", closed: "已关闭" };
const scenarioLabels: Record<string, string> = {
  database_restore: "数据库恢复", storage_restore: "文件存储恢复", deployment_rollback: "版本回滚",
  credential_rotation: "密钥轮换", full_recovery: "完整灾备演练"
};

export function AdminOperationsPanel() {
  const [tab, setTab] = useState<"overview" | "support" | "recovery">("overview");
  const [health, setHealth] = useState<Health | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [runs, setRuns] = useState<RecoveryRun[]>([]);
  const [adminId, setAdminId] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const [{ data: { user } }, healthResult, eventResult, ticketResult, runResult] = await Promise.all([
      supabase.auth.getUser(),
      fetch("/api/health", { cache: "no-store" }).then(async (response) => ({ ...(await response.json()), httpOk: response.ok })).catch(() => null),
      supabase.from("operations_events").select("id, severity, source, event_code, message, route, created_at").is("resolved_at", null).order("created_at", { ascending: false }).limit(100),
      supabase.from("support_tickets").select("id, user_id, category, priority, subject, description, status, created_at").neq("status", "closed").order("created_at", { ascending: false }).limit(100),
      supabase.from("recovery_runs").select("id, scenario, status, environment, rpo_minutes, rto_minutes, notes, created_at").order("created_at", { ascending: false }).limit(30)
    ]);
    setAdminId(user?.id ?? "");
    const dataQueriesHealthy = !eventResult.error && !ticketResult.error && !runResult.error;
    setHealth(
      healthResult && typeof healthResult === "object" && "services" in healthResult
        ? healthResult as Health
        : {
            status: dataQueriesHealthy ? "ok" : "degraded",
            checkedAt: new Date().toISOString(),
            services: { application: "up", database: dataQueriesHealthy ? "up" : "down" }
          }
    );
    setEvents((eventResult.data ?? []) as Event[]);
    setTickets((ticketResult.data ?? []) as Ticket[]);
    setRuns((runResult.data ?? []) as RecoveryRun[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function resolveEvent(id: string) {
    const note = window.prompt("填写处理结果（至少 5 个字）");
    if (!note || note.trim().length < 5) return;
    const { error } = await createSupabaseBrowserClient().rpc("admin_resolve_operations_event", { target_event_id: id, resolution_note: note.trim() });
    setNotice(error ? error.message : "告警已标记为已处理。");
    if (!error) await load();
  }

  async function updateTicket(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const { error } = await createSupabaseBrowserClient().rpc("admin_update_support_ticket", {
      target_ticket_id: id,
      next_status: String(form.get("status")),
      next_priority: String(form.get("priority")),
      reply_body: String(form.get("reply") ?? "").trim() || null
    });
    setNotice(error ? error.message : "工单状态与回复已更新。");
    if (!error) await load();
  }

  async function recordRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const status = String(form.get("status"));
    const { error } = await createSupabaseBrowserClient().from("recovery_runs").insert({
      scenario: String(form.get("scenario")),
      status,
      environment: String(form.get("environment")),
      rpo_minutes: Number(form.get("rpo_minutes")) || null,
      rto_minutes: Number(form.get("rto_minutes")) || null,
      notes: String(form.get("notes")).trim(),
      evidence_url: String(form.get("evidence_url")).trim() || null,
      started_by: adminId,
      completed_at: status === "passed" || status === "failed" ? new Date().toISOString() : null
    });
    setNotice(error ? error.message : "恢复演练记录已保存。");
    if (!error) { event.currentTarget.reset(); await load(); }
  }

  const openTickets = tickets.filter((ticket) => ticket.status === "open").length;
  const urgentTickets = tickets.filter((ticket) => ticket.priority === "urgent").length;
  const criticalEvents = events.filter((event) => event.severity === "critical").length;

  return (
    <section>
      <header className="rounded-card border border-line bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-primary"><Activity size={16} />Operations</p><h1 className="mt-2 font-display text-3xl font-black">运维、告警与客服</h1><p className="mt-2 text-sm font-semibold text-muted">先看服务可用性，再处理错误告警和用户问题；所有高风险动作进入审计记录。</p></div>
          <button onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-line bg-bg px-4 text-sm font-black"><RefreshCw size={15} />刷新状态</button>
        </div>
        <nav className="mt-5 flex flex-wrap gap-2" aria-label="运维工作台分类">
          {([{ id: "overview", label: "监控与告警" }, { id: "support", label: "客服工单" }, { id: "recovery", label: "灾备演练" }] as const).map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`min-h-10 rounded-pill px-4 text-sm font-black ${tab === item.id ? "bg-ink text-white" : "bg-bg text-muted"}`}>{item.label}</button>)}
        </nav>
      </header>
      {notice ? <p role="status" className="mt-4 rounded-[16px] border border-primary/20 bg-white p-4 text-sm font-bold text-primary">{notice}</p> : null}
      {loading ? <div className="grid min-h-72 place-items-center"><LoaderCircle className="animate-spin text-primary" /></div> : null}

      {!loading && tab === "overview" ? <>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={Server} label="应用状态" value={health?.services.application === "up" ? "正常" : "异常"} danger={health?.services.application !== "up"} />
          <Metric icon={DatabaseBackup} label="数据库状态" value={health?.services.database === "up" ? (health.databaseLatencyMs == null ? "正常" : `${health.databaseLatencyMs} ms`) : "异常"} danger={health?.services.database !== "up"} />
          <Metric icon={AlertTriangle} label="未处理严重告警" value={String(criticalEvents)} danger={criticalEvents > 0} />
          <Metric icon={Headphones} label="紧急客服工单" value={String(urgentTickets)} danger={urgentTickets > 0} />
        </div>
        <div className="mt-5 rounded-card border border-line bg-white p-5 shadow-soft">
          <div className="flex items-end justify-between gap-3"><div><h2 className="font-display text-2xl font-black">未处理事件</h2><p className="mt-1 text-xs font-semibold text-muted">浏览器运行时错误会去重并限制每次会话最多上报 3 次，不包含堆栈和查询参数。</p></div><span className="text-sm font-black text-muted">{events.length} 条</span></div>
          <div className="mt-4 space-y-3">{events.map((item) => <article key={item.id} className="grid gap-3 rounded-[18px] border border-line bg-bg p-4 md:grid-cols-[auto_1fr_auto] md:items-center"><span className={`grid size-10 place-items-center rounded-full ${item.severity === "critical" ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"}`}><AlertTriangle size={17} /></span><div className="min-w-0"><h3 className="truncate text-sm font-black">{item.event_code} · {item.message}</h3><p className="mt-1 text-xs font-semibold text-muted">{item.source}{item.route ? ` · ${item.route}` : ""} · {new Date(item.created_at).toLocaleString("zh-CN")}</p></div><button onClick={() => void resolveEvent(item.id)} className="min-h-10 rounded-pill bg-white px-4 text-xs font-black">标记已处理</button></article>)}{events.length === 0 ? <Empty text="当前没有未处理的应用事件。" /> : null}</div>
        </div>
      </> : null}

      {!loading && tab === "support" ? <div className="mt-5 space-y-4">
        <div className="flex items-center justify-between"><h2 className="font-display text-2xl font-black">客服队列</h2><span className="rounded-pill bg-white px-3 py-2 text-xs font-black text-muted">待受理 {openTickets} · 总计 {tickets.length}</span></div>
        {tickets.map((ticket) => <form key={ticket.id} onSubmit={(event) => void updateTicket(event, ticket.id)} className="rounded-card border border-line bg-white p-5 shadow-soft"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-base font-black">{ticket.subject}</h3><p className="mt-1 text-xs font-bold text-muted">用户 {ticket.user_id.slice(0, 8)} · {new Date(ticket.created_at).toLocaleString("zh-CN")}</p></div><span className={`rounded-pill px-3 py-1.5 text-xs font-black ${ticket.priority === "urgent" ? "bg-danger/10 text-danger" : "bg-bg text-muted"}`}>{ticketStatusLabels[ticket.status]}</span></div><p className="mt-4 whitespace-pre-wrap rounded-[14px] bg-bg p-4 text-sm font-semibold leading-6 text-muted">{ticket.description}</p><div className="mt-4 grid gap-3 md:grid-cols-[150px_160px_1fr_auto]"><select name="status" defaultValue={ticket.status} className="h-11 rounded-[14px] border border-line bg-bg px-3 text-sm font-bold">{Object.entries(ticketStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select name="priority" defaultValue={ticket.priority} className="h-11 rounded-[14px] border border-line bg-bg px-3 text-sm font-bold"><option value="low">低优先</option><option value="normal">普通</option><option value="high">高优先</option><option value="urgent">紧急</option></select><input name="reply" maxLength={4000} className="h-11 min-w-0 rounded-[14px] border border-line bg-bg px-3 text-sm" placeholder="回复用户（可选）" /><button className="min-h-11 rounded-pill bg-ink px-5 text-sm font-black text-white">保存处理</button></div></form>)}
        {tickets.length === 0 ? <Empty text="当前没有待处理客服工单。" /> : null}
      </div> : null}

      {!loading && tab === "recovery" ? <div className="mt-5 grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
        <form onSubmit={recordRecovery} className="rounded-card border border-line bg-white p-5 shadow-soft"><h2 className="font-display text-2xl font-black">记录恢复演练</h2><p className="mt-2 text-xs font-semibold leading-5 text-muted">这里只记录已真实执行或已排期的演练，不会自动触发生产数据库恢复。</p><label className="mt-5 block text-sm font-black">场景<select name="scenario" className="mt-2 h-11 w-full rounded-[14px] border border-line bg-bg px-3">{Object.entries(scenarioLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><div className="mt-4 grid grid-cols-2 gap-3"><label className="text-sm font-black">状态<select name="status" className="mt-2 h-11 w-full rounded-[14px] border border-line bg-bg px-3"><option value="planned">已计划</option><option value="running">进行中</option><option value="passed">通过</option><option value="failed">失败</option></select></label><label className="text-sm font-black">环境<select name="environment" className="mt-2 h-11 w-full rounded-[14px] border border-line bg-bg px-3"><option value="staging">演练环境</option><option value="local">本地</option><option value="production">生产</option></select></label></div><div className="mt-4 grid grid-cols-2 gap-3"><label className="text-sm font-black">RPO（分钟）<input name="rpo_minutes" type="number" min="0" className="mt-2 h-11 w-full rounded-[14px] border border-line bg-bg px-3" /></label><label className="text-sm font-black">RTO（分钟）<input name="rto_minutes" type="number" min="0" className="mt-2 h-11 w-full rounded-[14px] border border-line bg-bg px-3" /></label></div><label className="mt-4 block text-sm font-black">演练说明<textarea name="notes" required minLength={5} maxLength={4000} rows={4} className="mt-2 w-full rounded-[14px] border border-line bg-bg p-3 text-sm" /></label><label className="mt-4 block text-sm font-black">证据链接（可选）<input name="evidence_url" type="url" className="mt-2 h-11 w-full rounded-[14px] border border-line bg-bg px-3 text-sm" /></label><button className="mt-4 min-h-11 w-full rounded-pill bg-ink px-4 text-sm font-black text-white">保存演练记录</button></form>
        <section className="rounded-card border border-line bg-white p-5 shadow-soft"><div className="flex items-center gap-3"><DatabaseBackup className="text-primary" /><div><h2 className="font-display text-2xl font-black">恢复记录</h2><p className="text-xs font-semibold text-muted">目标：明确数据损失窗口 RPO 与恢复时间 RTO</p></div></div><div className="mt-5 space-y-3">{runs.map((run) => <article key={run.id} className="rounded-[18px] border border-line bg-bg p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-black">{scenarioLabels[run.scenario]}</h3><span className={`inline-flex items-center gap-1 text-xs font-black ${run.status === "passed" ? "text-primary" : run.status === "failed" ? "text-danger" : "text-muted"}`}>{run.status === "passed" ? <CheckCircle2 size={14} /> : null}{run.status}</span></div><p className="mt-2 text-sm font-semibold leading-6 text-muted">{run.notes}</p><p className="mt-2 text-xs font-bold text-muted">{run.environment} · RPO {run.rpo_minutes ?? "未记录"} 分钟 · RTO {run.rto_minutes ?? "未记录"} 分钟 · {new Date(run.created_at).toLocaleString("zh-CN")}</p></article>)}{runs.length === 0 ? <Empty text="尚未记录恢复演练。请先在演练或本地环境完成一次。" /> : null}</div></section>
      </div> : null}
    </section>
  );
}

function Metric({ icon: Icon, label, value, danger }: { icon: typeof Activity; label: string; value: string; danger?: boolean }) {
  return <article className={`rounded-[20px] border bg-white p-5 ${danger ? "border-danger/30" : "border-line"}`}><div className="flex items-center justify-between"><span className={`grid size-10 place-items-center rounded-full ${danger ? "bg-danger/10 text-danger" : "bg-bg text-primary"}`}><Icon size={18} /></span><span className={`font-display text-2xl font-black ${danger ? "text-danger" : "text-ink"}`}>{value}</span></div><p className="mt-4 text-xs font-black text-muted">{label}</p></article>;
}
function Empty({ text }: { text: string }) {
  return <p className="rounded-[18px] border border-dashed border-line bg-bg p-8 text-center text-sm font-semibold text-muted">{text}</p>;
}
