"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, LoaderCircle, MessageCircle, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  related_order_id: string | null;
  read_at: string | null;
  created_at: string;
};

export function NotificationCenter() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data, error: queryError } = await createSupabaseBrowserClient().from("notifications").select("id, type, title, body, related_order_id, read_at, created_at").order("created_at", { ascending: false }).limit(30);
    if (queryError) setError(queryError.message);
    else setItems((data ?? []) as Notification[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markRead(id: string) {
    const { error: rpcError } = await createSupabaseBrowserClient().rpc("mark_notification_read", { target_notification_id: id });
    if (rpcError) { setError(rpcError.message); return; }
    setItems((current) => current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
    window.dispatchEvent(new Event("notification-read"));
  }

  async function markAllRead() {
    const { error: rpcError } = await createSupabaseBrowserClient().rpc("mark_all_notifications_read");
    if (rpcError) { setError(rpcError.message); return; }
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
    window.dispatchEvent(new Event("notification-read"));
  }

  const unread = items.filter((item) => !item.read_at).length;

  return <article id="notifications" className="rounded-card border border-line bg-white p-5 shadow-soft">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-black uppercase tracking-wider text-pink">Supabase Inbox</p><h2 className="mt-1 font-display text-2xl font-black">消息与通知中心</h2></div>
      <div className="flex items-center gap-2"><span className="inline-flex items-center gap-2 rounded-pill bg-pink/12 px-3 py-1.5 text-xs font-black text-pink"><Bell size={14} />{unread} 条未读</span>{unread > 0 ? <Button type="button" variant="secondary" onClick={markAllRead}><CheckCheck size={15} />全部已读</Button> : null}</div>
    </div>
    {loading ? <div className="flex justify-center py-10"><LoaderCircle className="animate-spin text-primary" /></div> : <div className="mt-5 space-y-3">
      {items.map((item) => {
        const Icon = item.type === "commission_message" ? MessageCircle : ReceiptText;
        const content = <div className={`flex gap-3 rounded-[22px] border p-4 transition ${item.read_at ? "border-transparent bg-bg" : "border-pink/25 bg-pink/5"}`}><span className={`mt-0.5 grid size-10 shrink-0 place-items-center rounded-pill ${item.read_at ? "bg-white text-muted" : "bg-pink/12 text-pink"}`}><Icon size={17} /></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><p className="text-sm font-black text-ink">{item.title}</p>{!item.read_at ? <span className="mt-1 size-2 shrink-0 rounded-pill bg-pink" /> : null}</div><p className="mt-1 text-sm font-semibold leading-6 text-muted">{item.body}</p><time className="mt-2 block text-xs font-bold text-muted/70">{new Date(item.created_at).toLocaleString("zh-CN")}</time></div></div>;
        return item.related_order_id ? <Link key={item.id} href="/profile/commissions" onClick={() => markRead(item.id)}>{content}</Link> : <button key={item.id} type="button" onClick={() => markRead(item.id)} className="block w-full text-left">{content}</button>;
      })}
      {items.length === 0 ? <p className="rounded-[22px] bg-bg px-4 py-8 text-center text-sm font-semibold text-muted">暂无通知。新的报价、订单推进、交稿、争议或订单消息会显示在这里。</p> : null}
    </div>}
    {error ? <p role="alert" className="mt-3 text-sm font-bold text-danger">{error}</p> : null}
  </article>;
}
