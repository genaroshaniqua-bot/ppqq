"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AdminItem = {
  id: string;
  kind: "privacy" | "case";
  type: string;
  status: string;
  description: string;
  target?: string;
  claimant?: string;
  resolution: string | null;
  created_at: string;
};

export function AdminTrustPanel() {
  const [items, setItems] = useState<AdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<"open" | "all">("open");

  async function load() {
    const supabase = createSupabaseBrowserClient();
    const [privacy, cases] = await Promise.all([
      supabase.from("privacy_requests").select("id, request_type, status, details, resolution, created_at").order("created_at", { ascending: false }),
      supabase.from("trust_cases").select("id, case_type, target_type, target_id, status, description, claimant_name, claimant_contact, resolution, created_at").order("created_at", { ascending: false })
    ]);
    if (privacy.error || cases.error) setMessage(privacy.error?.message ?? cases.error?.message ?? "加载失败");
    setItems([
      ...(privacy.data ?? []).map((item) => ({ id: item.id, kind: "privacy" as const, type: item.request_type, status: item.status, description: item.details, resolution: item.resolution, created_at: item.created_at })),
      ...(cases.data ?? []).map((item) => ({ id: item.id, kind: "case" as const, type: item.case_type, status: item.status, description: item.description, target: `${item.target_type} · ${item.target_id}`, claimant: item.claimant_name ? `${item.claimant_name} · ${item.claimant_contact ?? ""}` : undefined, resolution: item.resolution, created_at: item.created_at }))
    ].sort((a, b) => b.created_at.localeCompare(a.created_at)));
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function review(item: AdminItem, status: string) {
    const note = window.prompt("请输入处理理由（至少 5 个字符）。该内容会展示给提交者并写入审计日志。");
    if (!note || note.trim().length < 5) return;
    setMessage("正在保存处理结果…");
    const supabase = createSupabaseBrowserClient();
    const result = item.kind === "privacy"
      ? await supabase.rpc("admin_review_privacy_request", { target_request_id: item.id, next_status: status, review_note: note.trim() })
      : await supabase.rpc("admin_review_trust_case", { target_case_id: item.id, next_status: status, review_note: note.trim() });
    if (result.error) return setMessage(result.error.message);
    setMessage("处理结果已保存，并已写入管理员审计日志。");
    await load();
  }

  const closed = new Set(["completed", "actioned", "rejected", "cancelled", "withdrawn"]);
  const visible = filter === "all" ? items : items.filter((item) => !closed.has(item.status));

  if (loading) return <div className="grid min-h-52 place-items-center"><LoaderCircle className="animate-spin text-primary" /></div>;

  return (
    <section>
      <header className="rounded-card bg-ink p-7 text-white shadow-soft">
        <div className="flex items-center gap-2 text-lime"><ShieldCheck size={18} /><p className="text-xs font-black uppercase tracking-[0.16em]">Trust operations</p></div>
        <h1 className="mt-3 font-display text-3xl font-black">信任与安全工作台</h1>
        <p className="mt-2 text-sm font-semibold text-white/65">统一处理隐私权利、内容举报、版权通知、反通知和申诉；每次处理必须填写理由。</p>
      </header>
      <div className="mt-5 flex gap-2">
        <button onClick={() => setFilter("open")} className={`min-h-11 rounded-pill px-4 text-sm font-black ${filter === "open" ? "bg-ink text-white" : "bg-white text-muted"}`}>待处理</button>
        <button onClick={() => setFilter("all")} className={`min-h-11 rounded-pill px-4 text-sm font-black ${filter === "all" ? "bg-ink text-white" : "bg-white text-muted"}`}>全部记录</button>
      </div>
      {message ? <p role="status" className="mt-4 rounded-card border border-primary/20 bg-primary/5 p-4 text-sm font-bold text-primary">{message}</p> : null}
      <div className="mt-5 space-y-3">
        {visible.map((item) => (
          <article key={item.id} className="rounded-card border border-line bg-white p-5 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs font-black uppercase text-primary">{item.kind === "privacy" ? "隐私权利" : "举报 / 版权 / 申诉"}</p><h2 className="mt-1 text-lg font-black">{item.type}</h2>{item.target ? <p className="mt-1 break-all text-xs font-semibold text-muted">{item.target}</p> : null}</div>
              <span className="rounded-pill bg-bg px-3 py-1 text-xs font-black">{item.status}</span>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm font-semibold leading-6 text-muted">{item.description}</p>
            {item.claimant ? <p className="mt-3 rounded-[14px] border border-line bg-bg p-3 text-xs font-semibold text-muted">版权提交者：{item.claimant}</p> : null}
            <p className="mt-3 break-all font-mono text-[10px] text-muted">{item.id}</p>
            {item.resolution ? <p className="mt-3 rounded-[14px] bg-bg p-3 text-xs font-semibold text-muted">最近处理说明：{item.resolution}</p> : null}
            {!closed.has(item.status) ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => review(item, "in_review")} className="min-h-10 rounded-pill border border-line px-4 text-xs font-black">开始处理</button>
                <button onClick={() => review(item, "awaiting_user")} className="min-h-10 rounded-pill border border-line px-4 text-xs font-black">要求补充</button>
                <button onClick={() => review(item, item.kind === "privacy" ? "completed" : "actioned")} className="min-h-10 rounded-pill bg-lime px-4 text-xs font-black">支持并完成</button>
                <button onClick={() => review(item, "rejected")} className="min-h-10 rounded-pill bg-ink px-4 text-xs font-black text-white">不予支持</button>
              </div>
            ) : null}
          </article>
        ))}
        {visible.length === 0 ? <p className="rounded-card border border-dashed border-line bg-white p-8 text-center text-sm font-semibold text-muted">当前没有待处理事项。</p> : null}
      </div>
    </section>
  );
}
