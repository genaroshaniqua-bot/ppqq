"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Layers3, LoaderCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ArtistService = { id: string; title: string };
type PackageRow = { id: string; service_id: string; tier: "basic" | "standard" | "premium"; title: string; description: string; price: number; delivery_days: number; revision_limit: number; features: string[]; is_active: boolean };
const tierLabels = { basic: "基础", standard: "标准", premium: "高级" };

export function ServicePackageManager() {
  const [services, setServices] = useState<ArtistService[]>([]);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setLoading(false);
    const [{ data: serviceRows, error: serviceError }, { data: packageRows, error: packageError }] = await Promise.all([
      supabase.from("artist_services").select("id, title").eq("artist_id", user.id).order("created_at"),
      supabase.from("service_packages").select("id, service_id, tier, title, description, price, delivery_days, revision_limit, features, is_active").order("position")
    ]);
    const error = serviceError ?? packageError;
    if (error) setMessage(error.message);
    setServices((serviceRows ?? []) as ArtistService[]);
    setPackages((packageRows ?? []).map((item) => ({ ...item, price: Number(item.price) })) as PackageRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  const grouped = useMemo(() => new Map(services.map((service) => [service.id, packages.filter((item) => item.service_id === service.id)])), [packages, services]);

  async function savePackage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSaving(true);
    setMessage("");
    const tier = String(form.get("tier")) as PackageRow["tier"];
    const { error } = await createSupabaseBrowserClient().from("service_packages").upsert({
      service_id: String(form.get("serviceId")),
      tier,
      title: String(form.get("title")).trim(),
      description: String(form.get("description")).trim(),
      price: Number(form.get("price")),
      delivery_days: Number(form.get("deliveryDays")),
      revision_limit: Number(form.get("revisionLimit")),
      features: String(form.get("features")).split(/[,，\n]/).map((item) => item.trim()).filter(Boolean),
      position: tier === "basic" ? 0 : tier === "standard" ? 1 : 2,
      is_active: true,
      updated_at: new Date().toISOString()
    }, { onConflict: "service_id,tier" });
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    formElement.reset();
    setMessage("套餐已保存并同步到服务详情页。");
    await load();
  }

  if (loading) return <div className="mt-6 grid min-h-28 place-items-center rounded-card border border-line bg-white"><LoaderCircle className="animate-spin text-primary" /></div>;

  return (
    <section className="mt-6 rounded-[30px] border border-line bg-white p-5 shadow-soft sm:p-6" aria-labelledby="package-manager-heading">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Service packages</p><h2 id="package-manager-heading" className="mt-1 font-display text-2xl font-black">服务套餐管理</h2><p className="mt-2 text-sm font-semibold text-muted">为同一服务配置基础、标准和高级方案，明确价格、交付和修改次数。</p></div><span className="rounded-pill bg-lime px-3 py-2 text-xs font-black">{packages.length} 个套餐</span></div>
      {services.length ? <form onSubmit={savePackage} className="mt-5 grid gap-3 rounded-[20px] bg-bg p-4 md:grid-cols-2 xl:grid-cols-4"><label className="text-xs font-black">所属服务<select name="serviceId" required className="mt-2 h-11 w-full rounded-[12px] border border-line bg-white px-3 text-sm font-bold">{services.map((service) => <option key={service.id} value={service.id}>{service.title}</option>)}</select></label><label className="text-xs font-black">套餐等级<select name="tier" className="mt-2 h-11 w-full rounded-[12px] border border-line bg-white px-3 text-sm font-bold"><option value="basic">基础</option><option value="standard">标准</option><option value="premium">高级</option></select></label><label className="text-xs font-black">套餐名称<input name="title" required placeholder="标准精绘方案" className="mt-2 h-11 w-full rounded-[12px] border border-line bg-white px-3 text-sm font-bold" /></label><label className="text-xs font-black">价格<input name="price" type="number" min="1" required defaultValue="299" className="mt-2 h-11 w-full rounded-[12px] border border-line bg-white px-3 text-sm font-bold" /></label><label className="text-xs font-black">交付天数<input name="deliveryDays" type="number" min="1" required defaultValue="14" className="mt-2 h-11 w-full rounded-[12px] border border-line bg-white px-3 text-sm font-bold" /></label><label className="text-xs font-black">修改次数<input name="revisionLimit" type="number" min="0" required defaultValue="2" className="mt-2 h-11 w-full rounded-[12px] border border-line bg-white px-3 text-sm font-bold" /></label><label className="text-xs font-black md:col-span-2">套餐说明<input name="description" required placeholder="适合头像和半身展示" className="mt-2 h-11 w-full rounded-[12px] border border-line bg-white px-3 text-sm font-bold" /></label><label className="text-xs font-black md:col-span-2 xl:col-span-3">包含内容<input name="features" required placeholder="草稿确认、透明底 PNG、个人使用授权" className="mt-2 h-11 w-full rounded-[12px] border border-line bg-white px-3 text-sm font-bold" /></label><Button type="submit" disabled={saving} className="self-end"><Plus size={16} />保存套餐</Button></form> : <p className="mt-5 rounded-[18px] bg-bg p-4 text-sm font-semibold text-muted">请先发布一项画师服务，再为它配置套餐。</p>}
      {message ? <p role="status" className="mt-4 flex items-center gap-2 rounded-[16px] bg-ink px-4 py-3 text-sm font-bold text-white"><CheckCircle2 size={16} className="text-lime" />{message}</p> : null}
      <div className="mt-5 grid gap-3 lg:grid-cols-2">{services.map((service) => <article key={service.id} className="rounded-[20px] border border-line p-4"><div className="flex items-center gap-2"><Layers3 size={17} className="text-purple" /><h3 className="font-display text-lg font-black">{service.title}</h3></div><div className="mt-3 flex flex-wrap gap-2">{grouped.get(service.id)?.map((item) => <span key={item.id} className="rounded-pill bg-bg px-3 py-2 text-xs font-black">{tierLabels[item.tier]} · ¥{item.price} · {item.delivery_days} 天</span>)}{!grouped.get(service.id)?.length ? <span className="text-xs font-semibold text-muted">暂无套餐</span> : null}</div></article>)}</div>
    </section>
  );
}
