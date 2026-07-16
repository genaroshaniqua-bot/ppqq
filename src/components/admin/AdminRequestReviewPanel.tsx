"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, CircleAlert, EyeOff, LoaderCircle, RotateCcw, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ReviewRequest = {
  id: string; title: string; brief: string; service_type: string | null; budget_min: number | null;
  budget_max: number | null; usage_scope: string; moderation_status: string; moderation_reason: string | null;
  reports_count: number; collection_ends_at: string | null; client_id: string;
};

export function AdminRequestReviewPanel() {
  const [items, setItems] = useState<ReviewRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await createSupabaseBrowserClient().from("commission_requests")
      .select("id,title,brief,service_type,budget_min,budget_max,usage_scope,moderation_status,moderation_reason,reports_count,collection_ends_at,client_id")
      .eq("request_mode", "public").or("moderation_status.eq.pending_review,reports_count.gt.0").order("created_at", { ascending: false });
    if (error) setMessage(error.message); else setItems((data ?? []) as ReviewRequest[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function review(id: string, decision: "approved" | "revision_requested" | "rejected" | "hidden", note: string) {
    if (note.trim().length < 5) return setMessage("请填写至少 5 个字的审核说明。");
    setSaving(true); setMessage("");
    const { error } = await createSupabaseBrowserClient().rpc("review_public_commission_request", { target_request_id: id, review_decision: decision, review_note: note });
    setSaving(false);
    if (error) return setMessage(error.message);
    setMessage("需求审核状态已更新。");
    await load();
  }

  return <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <header className="rounded-[34px] bg-ink p-6 text-white shadow-soft sm:p-8"><p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-lime"><ShieldCheck size={16} />Risk review</p><h1 className="mt-3 font-display text-4xl font-black sm:text-5xl">公开需求审核</h1><p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/64">处理预算达到 ¥3000、商用授权、版权买断、敏感内容命中或被举报的需求。</p></header>
    {message ? <p role="status" className="mt-5 rounded-[16px] bg-primary/10 px-4 py-3 text-sm font-bold text-primary">{message}</p> : null}
    {loading ? <div className="mt-6 grid min-h-40 place-items-center rounded-card bg-white"><LoaderCircle className="animate-spin text-primary" /></div> : <div className="mt-6 grid gap-4">{items.map((item) => <ReviewCard key={item.id} item={item} saving={saving} onReview={review} />)}{items.length === 0 ? <p className="rounded-card border border-dashed border-line bg-white p-8 text-center text-sm font-bold text-muted">目前没有等待处理的高风险或举报需求。</p> : null}</div>}
  </section>;
}

function ReviewCard({ item, saving, onReview }: { item: ReviewRequest; saving: boolean; onReview: (id: string, decision: "approved" | "revision_requested" | "rejected" | "hidden", note: string) => Promise<void> }) {
  const [note, setNote] = useState(item.moderation_reason ?? "");
  return <article className="rounded-[24px] border border-line bg-white p-5 shadow-soft"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><span className="rounded-pill bg-danger/10 px-3 py-1 text-xs font-black text-danger"><CircleAlert size={13} className="mr-1 inline" />{item.moderation_status === "pending_review" ? "待审核" : "被举报"}</span><span className="rounded-pill bg-bg px-3 py-1 text-xs font-black">{item.service_type}</span></div><h2 className="mt-3 font-display text-2xl font-black">{item.title}</h2></div><div className="text-right"><p className="text-sm font-black">¥{item.budget_min}–¥{item.budget_max}</p><p className="mt-1 text-xs font-bold text-muted">{item.usage_scope === "buyout" ? "版权买断" : item.usage_scope === "commercial" ? "商业授权" : "个人使用"} · 举报 {item.reports_count}</p></div></div><p className="mt-4 text-sm font-semibold leading-6 text-muted">{item.brief}</p>{item.moderation_reason ? <p className="mt-3 rounded-[14px] bg-danger/5 px-3 py-2 text-xs font-bold text-danger">触发原因：{item.moderation_reason}</p> : null}<label className="mt-4 block text-xs font-black">审核说明<input value={note} onChange={(event) => setNote(event.target.value)} placeholder="说明通过、修改或拒绝依据" className="mt-2 h-11 w-full rounded-[14px] border border-line bg-bg px-3 text-sm font-semibold outline-none focus:border-primary" /></label><div className="mt-4 flex flex-wrap gap-2"><Button type="button" disabled={saving} onClick={() => onReview(item.id, "approved", note || "内容与授权信息已核对通过")}><BadgeCheck size={15} />通过并公开</Button><Button type="button" variant="secondary" disabled={saving} onClick={() => onReview(item.id, "revision_requested", note)}><RotateCcw size={15} />要求修改</Button><Button type="button" variant="danger" disabled={saving} onClick={() => onReview(item.id, "rejected", note)}><XCircle size={15} />拒绝</Button><Button type="button" variant="secondary" disabled={saving} onClick={() => onReview(item.id, "hidden", note)}><EyeOff size={15} />隐藏需求</Button></div></article>;
}
