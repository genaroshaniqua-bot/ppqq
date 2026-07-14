"use client";

import { useCallback, useEffect, useState } from "react";
import { BriefcaseBusiness, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Service = { id: string; artist_id: string; title: string; description: string; service_type: string; base_price: number; is_active: boolean };

export function AdminServicePanel() {
  const [services, setServices] = useState<Service[]>([]);
  const [artistNames, setArtistNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.from("artist_services").select("id, artist_id, title, description, service_type, base_price, is_active").order("created_at", { ascending: false });
    if (error) throw error;
    const rows = (data ?? []) as Service[];
    const ids = [...new Set(rows.map((service) => service.artist_id))];
    let profiles: Array<{ id: string; display_name: string }> = [];
    if (ids.length) {
      const { data: profileRows, error: profileError } = await supabase.from("profiles").select("id, display_name").in("id", ids);
      if (profileError) throw profileError;
      profiles = profileRows ?? [];
    }
    setServices(rows); setArtistNames(Object.fromEntries(profiles.map((profile) => [profile.id, profile.display_name]))); setLoading(false);
  }, []);

  useEffect(() => { load().catch((error) => { setMessage(typeof error === "object" && error && "message" in error ? String(error.message) : "服务加载失败"); setLoading(false); }); }, [load]);

  async function moderate(service: Service) {
    const reason = window.prompt(`请填写${service.is_active ? "下架" : "恢复"}「${service.title}」的原因（至少 4 个字）`)?.trim();
    if (!reason || reason.length < 4) { setMessage("服务状态变更必须填写至少 4 个字的原因。"); return; }
    setSaving(service.id); setMessage("");
    const { error } = await createSupabaseBrowserClient().rpc("admin_moderate_service", { target_service_id: service.id, next_active: !service.is_active, moderation_reason: reason });
    setSaving("");
    if (error) { setMessage(error.message); return; }
    setMessage("服务状态已更新并写入审计记录"); await load();
  }

  if (loading) return <div className="grid min-h-52 place-items-center"><LoaderCircle className="animate-spin text-primary" /></div>;
  return <section><div className="rounded-card border border-line bg-white p-5 shadow-soft"><p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Service moderation</p><h1 className="mt-2 font-display text-3xl font-black">画师服务管理</h1><p className="mt-2 text-sm font-semibold text-muted">检查服务说明、定价和状态。管理员变更会写入操作审计。</p></div>{message ? <p role="status" className="mt-5 rounded-pill bg-ink px-5 py-3 text-center text-sm font-black text-white">{message}</p> : null}<div className="mt-5 grid gap-4 lg:grid-cols-2">{services.map((service) => <article key={service.id} className="rounded-card border border-line bg-white p-5 shadow-soft"><div className="flex items-start justify-between gap-3"><span className="grid size-11 place-items-center rounded-full bg-primary/12 text-primary"><BriefcaseBusiness size={19} /></span><span className={`rounded-pill px-3 py-1 text-xs font-black ${service.is_active ? "bg-lime text-ink" : "bg-line text-muted"}`}>{service.is_active ? "展示中" : "已下架"}</span></div><p className="mt-4 text-xs font-black text-purple">{artistNames[service.artist_id] ?? service.artist_id} · {service.service_type}</p><h2 className="mt-1 font-display text-xl font-black">{service.title}</h2><p className="mt-2 text-sm font-semibold leading-6 text-muted">{service.description}</p><div className="mt-4 flex items-center justify-between gap-3"><span className="font-display text-xl font-black">¥{service.base_price} 起</span><Button type="button" variant="secondary" disabled={saving === service.id} onClick={() => moderate(service)}>{service.is_active ? "下架服务" : "恢复服务"}</Button></div></article>)}{services.length === 0 ? <p className="rounded-card border border-dashed border-line bg-white p-8 text-center text-sm font-semibold text-muted lg:col-span-2">暂无画师服务。</p> : null}</div></section>;
}
