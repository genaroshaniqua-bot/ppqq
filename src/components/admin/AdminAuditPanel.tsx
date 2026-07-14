"use client";

import { useEffect, useState } from "react";
import { FileClock, LoaderCircle } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuditLog = {
  id: number;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
  created_at: string;
};

export function AdminAuditPanel() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    createSupabaseBrowserClient()
      .from("platform_audit_logs")
      .select("id, actor_id, action, entity_type, entity_id, details, created_at")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (error) setMessage(error.message);
        else setLogs((data ?? []) as AuditLog[]);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="grid min-h-52 place-items-center"><LoaderCircle className="animate-spin text-primary" /></div>;

  return (
    <section>
      <div className="rounded-card border border-line bg-white p-5 shadow-soft">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Audit trail</p>
        <h1 className="mt-2 font-display text-3xl font-black">管理员操作记录</h1>
        <p className="mt-2 text-sm font-semibold text-muted">记录角色、账号状态和内容管理等高风险操作。</p>
      </div>
      {message ? <p className="mt-5 rounded-card border border-danger/20 bg-danger/5 p-4 text-sm font-bold text-danger">{message}</p> : null}
      <div className="mt-5 space-y-3">
        {logs.map((log) => (
          <article key={log.id} className="grid gap-3 rounded-card border border-line bg-white p-5 shadow-soft sm:grid-cols-[auto_1fr_auto] sm:items-start">
            <span className="grid size-10 place-items-center rounded-full bg-bg text-primary"><FileClock size={18} /></span>
            <div>
              <h2 className="text-sm font-black">{log.action}</h2>
              <p className="mt-1 text-xs font-semibold text-muted">{log.entity_type} · {log.entity_id}</p>
              <pre className="mt-3 overflow-x-auto rounded-[14px] bg-bg p-3 text-xs font-semibold leading-5 text-muted">{JSON.stringify(log.details, null, 2)}</pre>
            </div>
            <time className="text-xs font-semibold text-muted">{new Date(log.created_at).toLocaleString("zh-CN")}</time>
          </article>
        ))}
        {logs.length === 0 && !message ? <p className="rounded-card border border-dashed border-line bg-white p-8 text-center text-sm font-semibold text-muted">暂无管理员操作记录。</p> : null}
      </div>
    </section>
  );
}
