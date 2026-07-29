"use client";

import { FormEvent, useEffect, useState } from "react";
import { CircleHelp, Clock3, LoaderCircle, MessageCircleMore, Send } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Ticket = {
  id: string;
  category: string;
  priority: string;
  subject: string;
  description: string;
  status: string;
  created_at: string;
};

type Message = { id: string; ticket_id: string; author_id: string; body: string; created_at: string };

const categoryLabels: Record<string, string> = {
  account: "账户与登录", commission: "约稿与交付", shop: "商城与订单", copyright: "版权问题",
  privacy: "隐私权利", technical: "功能故障", other: "其他问题"
};
const statusLabels: Record<string, string> = {
  open: "待受理", in_progress: "处理中", waiting_user: "待您补充", resolved: "已解决", closed: "已关闭"
};

export function SupportCenter() {
  const [userId, setUserId] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeId, setActiveId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  async function load() {
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setLoading(false);
    setUserId(user.id);
    const [ticketResult, messageResult] = await Promise.all([
      supabase.from("support_tickets").select("id, category, priority, subject, description, status, created_at").order("created_at", { ascending: false }),
      supabase.from("support_ticket_messages").select("id, ticket_id, author_id, body, created_at").order("created_at")
    ]);
    setTickets((ticketResult.data ?? []) as Ticket[]);
    setMessages((messageResult.data ?? []) as Message[]);
    setActiveId((current) => current || ticketResult.data?.[0]?.id || "");
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function createTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;
    setSubmitting(true); setNotice("");
    const form = new FormData(event.currentTarget);
    const { error } = await createSupabaseBrowserClient().from("support_tickets").insert({
      user_id: userId,
      category: String(form.get("category")),
      priority: String(form.get("priority")),
      subject: String(form.get("subject")).trim(),
      description: String(form.get("description")).trim()
    });
    setSubmitting(false);
    if (error) return setNotice(error.message);
    event.currentTarget.reset();
    setNotice("工单已提交，客服处理进度会保留在这里。");
    await load();
  }

  async function reply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId || !activeId) return;
    const form = new FormData(event.currentTarget);
    const body = String(form.get("body")).trim();
    const { error } = await createSupabaseBrowserClient().from("support_ticket_messages").insert({
      ticket_id: activeId, author_id: userId, body
    });
    if (error) return setNotice(error.message);
    event.currentTarget.reset();
    setNotice("补充信息已发送。");
    await load();
  }

  const active = tickets.find((ticket) => ticket.id === activeId);
  const activeMessages = messages.filter((message) => message.ticket_id === activeId);

  return (
    <div className="mx-auto min-h-[calc(100dvh-5rem)] max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="rounded-card bg-ink p-7 text-white shadow-soft sm:p-9">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-lime">Support center</p>
        <h1 className="mt-2 font-display text-4xl font-black">客服中心</h1>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/65">账户、约稿、商城和功能故障统一在这里提交。紧急安全与版权问题请继续使用信任与安全中心。</p>
      </header>

      {notice ? <p role="status" className="mt-5 rounded-[18px] border border-primary/20 bg-white p-4 text-sm font-bold text-primary">{notice}</p> : null}
      {loading ? <div className="grid min-h-72 place-items-center"><LoaderCircle className="animate-spin text-primary" /></div> : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="space-y-5">
            <form onSubmit={createTicket} className="rounded-card border border-line bg-white p-5 shadow-soft">
              <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-bg text-primary"><CircleHelp size={19} /></span><div><h2 className="font-display text-xl font-black">提交新问题</h2><p className="text-xs font-semibold text-muted">请勿填写密码或身份证号</p></div></div>
              <label className="mt-5 block text-sm font-black">问题类型
                <select name="category" className="mt-2 h-11 w-full rounded-[14px] border border-line bg-bg px-3">
                  {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="mt-4 block text-sm font-black">紧急程度
                <select name="priority" defaultValue="normal" className="mt-2 h-11 w-full rounded-[14px] border border-line bg-bg px-3">
                  <option value="low">不紧急</option><option value="normal">普通</option><option value="high">影响使用</option><option value="urgent">核心流程阻断</option>
                </select>
              </label>
              <label className="mt-4 block text-sm font-black">问题标题
                <input name="subject" required minLength={4} maxLength={120} className="mt-2 h-11 w-full rounded-[14px] border border-line bg-bg px-3 text-sm" placeholder="例如：无法提交约稿方案" />
              </label>
              <label className="mt-4 block text-sm font-black">详细说明
                <textarea name="description" required minLength={10} maxLength={4000} rows={5} className="mt-2 w-full rounded-[14px] border border-line bg-bg p-3 text-sm" placeholder="发生在哪个页面、进行了什么操作、看到什么结果" />
              </label>
              <button disabled={submitting} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-pill bg-ink px-4 text-sm font-black text-white disabled:opacity-50"><Send size={15} />{submitting ? "提交中…" : "提交工单"}</button>
            </form>
          </section>

          <section className="min-w-0 rounded-card border border-line bg-white p-5 shadow-soft">
            <div className="flex items-center gap-3"><MessageCircleMore className="text-primary" /><div><h2 className="font-display text-2xl font-black">我的工单</h2><p className="text-xs font-semibold text-muted">状态更新与客服回复都会集中保留</p></div></div>
            {tickets.length === 0 ? <p className="mt-8 rounded-[18px] border border-dashed border-line bg-bg p-8 text-center text-sm font-semibold text-muted">暂无工单。遇到问题时，从左侧提交即可。</p> : (
              <div className="mt-5 grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
                <div className="space-y-2">
                  {tickets.map((ticket) => <button key={ticket.id} onClick={() => setActiveId(ticket.id)} className={`w-full rounded-[16px] border p-3 text-left ${activeId === ticket.id ? "border-primary bg-primary/5" : "border-line bg-bg"}`}><span className="block truncate text-sm font-black">{ticket.subject}</span><span className="mt-1 flex items-center justify-between text-[11px] font-bold text-muted"><span>{categoryLabels[ticket.category]}</span><span>{statusLabels[ticket.status]}</span></span></button>)}
                </div>
                {active ? <article className="min-w-0 rounded-[18px] border border-line p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-display text-xl font-black">{active.subject}</h3><p className="mt-1 text-xs font-bold text-muted">{categoryLabels[active.category]} · {statusLabels[active.status]}</p></div><time className="inline-flex items-center gap-1 text-xs font-bold text-muted"><Clock3 size={13} />{new Date(active.created_at).toLocaleString("zh-CN")}</time></div>
                  <p className="mt-4 whitespace-pre-wrap rounded-[14px] bg-bg p-4 text-sm font-semibold leading-6 text-muted">{active.description}</p>
                  <div className="mt-4 space-y-3">{activeMessages.map((message) => <div key={message.id} className={`rounded-[14px] p-3 text-sm font-semibold leading-6 ${message.author_id === userId ? "ml-8 bg-primary/10" : "mr-8 bg-bg"}`}><p>{message.body}</p><time className="mt-1 block text-[11px] text-muted">{new Date(message.created_at).toLocaleString("zh-CN")}</time></div>)}</div>
                  {active.status !== "closed" ? <form onSubmit={reply} className="mt-4 flex gap-2"><input name="body" required maxLength={4000} className="min-w-0 flex-1 rounded-pill border border-line bg-bg px-4 text-sm" placeholder="补充信息或回复客服" /><button className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-white" aria-label="发送补充信息"><Send size={16} /></button></form> : null}
                </article> : null}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
