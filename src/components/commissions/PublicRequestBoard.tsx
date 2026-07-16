"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, CalendarDays, CheckCircle2, CircleDollarSign, Clock3, LoaderCircle, Send, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type MarketRequest = {
  request_id: string; title: string; brief: string; service_type: string | null;
  budget_min: number | null; budget_max: number | null; deadline: string | null;
  usage_scope: string; collection_ends_at: string; response_count: number;
  lowest_quote: number | null; highest_quote: number | null; my_response_id: string | null;
};

type ClientRequest = {
  id: string; title: string; brief: string; service_type: string | null; budget_min: number | null;
  budget_max: number | null; usage_scope: string; collection_ends_at: string | null;
  moderation_status: string; moderation_reason: string | null; status: string; selected_response_id: string | null;
};

type ResponseItem = {
  id: string; request_id: string; artist_id: string; quote_amount: number; delivery_days: number;
  revision_limit: number; proposal_note: string; status: string; valid_until: string;
  artist_name?: string; service_title?: string; package_title?: string;
};

type Service = { id: string; title: string; service_type: string; packages: Package[] };
type Package = { id: string; service_id: string; title: string; tier: string; price: number; delivery_days: number; revision_limit: number };

const moderationLabels: Record<string, string> = {
  auto_approved: "自动检查通过", pending_review: "等待人工审核", approved: "管理员已通过",
  revision_requested: "需要修改", rejected: "审核未通过", hidden: "已隐藏"
};

export function PublicRequestBoard({ view }: { view: "client" | "artist" }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [market, setMarket] = useState<MarketRequest[]>([]);
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (view === "artist") {
      const [{ data: marketData }, { data: serviceData }, { data: packageData }] = await Promise.all([
        supabase.rpc("get_public_commission_market"),
        supabase.from("artist_services").select("id,title,service_type").eq("artist_id", user.id).eq("is_active", true),
        supabase.from("service_packages").select("id,service_id,title,tier,price,delivery_days,revision_limit").eq("is_active", true)
      ]);
      const packages = (packageData ?? []) as Package[];
      setMarket((marketData ?? []) as MarketRequest[]);
      setServices(((serviceData ?? []) as Omit<Service, "packages">[]).map((service) => ({ ...service, packages: packages.filter((pack) => pack.service_id === service.id) })));
    } else {
      const { data: requestData } = await supabase.from("commission_requests")
        .select("id,title,brief,service_type,budget_min,budget_max,usage_scope,collection_ends_at,moderation_status,moderation_reason,status,selected_response_id")
        .eq("client_id", user.id).eq("request_mode", "public").order("created_at", { ascending: false });
      const ownRequests = (requestData ?? []) as ClientRequest[];
      setRequests(ownRequests);
      const requestIds = ownRequests.map((request) => request.id);
      if (requestIds.length > 0) {
        const { data: responseData } = await supabase.from("commission_responses")
          .select("id,request_id,artist_id,quote_amount,delivery_days,revision_limit,proposal_note,status,valid_until,artist_services(title),service_packages(title)")
          .in("request_id", requestIds).order("quote_amount", { ascending: true });
        const baseResponses = (responseData ?? []).map((item) => {
          const serviceRelation = item.artist_services as unknown as { title?: string } | null;
          const packageRelation = item.service_packages as unknown as { title?: string } | null;
          return { ...item, service_title: serviceRelation?.title, package_title: packageRelation?.title } as ResponseItem;
        });
        const artistIds = [...new Set(baseResponses.map((item) => item.artist_id))];
        const { data: profiles } = artistIds.length > 0 ? await supabase.from("profiles").select("id,display_name").in("id", artistIds) : { data: [] };
        setResponses(baseResponses.map((item) => ({ ...item, artist_name: profiles?.find((profile) => profile.id === item.artist_id)?.display_name ?? "已审核画师" })));
      } else setResponses([]);
    }
    setLoading(false);
  }, [view]);

  useEffect(() => { load().catch((error) => { setMessage(error instanceof Error ? error.message : "公开需求加载失败"); setLoading(false); }); }, [load]);

  async function submitResponse(requestId: string, serviceId: string, packageId: string, quote: number, days: number, note: string) {
    setSaving(true); setMessage("");
    const { error } = await createSupabaseBrowserClient().rpc("submit_public_commission_response", {
      target_request_id: requestId, target_service_id: serviceId, target_package_id: packageId,
      response_quote: quote, response_delivery_days: days, response_note: note
    });
    setSaving(false);
    if (error) return setMessage(error.message);
    setMessage("接稿方案已提交，有效期为 72 小时。 ");
    await load();
  }

  async function selectResponse(responseId: string) {
    setSaving(true); setMessage("");
    const { error } = await createSupabaseBrowserClient().rpc("select_public_commission_response", { target_response_id: responseId });
    setSaving(false);
    if (error) return setMessage(error.message);
    setMessage("已选定画师并生成正式订单，请继续支付模拟定金。 ");
    await load();
  }

  if (loading) return <section className="mt-6 grid min-h-40 place-items-center rounded-card border border-line bg-white"><LoaderCircle className="animate-spin text-primary" /></section>;

  return <section className="mt-6 rounded-[30px] border border-line bg-white p-5 shadow-soft sm:p-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Public requests</p><h2 className="mt-1 font-display text-3xl font-black">{view === "artist" ? "公开需求大厅" : "公开需求与画师方案"}</h2><p className="mt-2 text-sm font-semibold text-muted">{view === "artist" ? "关联自己的有效服务和套餐提交方案；可查看响应人数与报价区间。" : "比较画师的报价、工期、服务和套餐，每个需求只能选择一名画师。"}</p></div>{view === "artist" ? <span className="rounded-pill bg-lime px-4 py-2 text-xs font-black">{market.length} 个需求正在征集</span> : null}</div>
    {message ? <p role="status" className="mt-4 rounded-[16px] bg-primary/10 px-4 py-3 text-sm font-bold text-primary">{message}</p> : null}

    <div className="mt-5 grid gap-4">
      {view === "artist" ? market.map((request) => <ArtistMarketCard key={request.request_id} request={request} services={services} saving={saving} onSubmit={submitResponse} />) : requests.map((request) => <ClientPublicRequestCard key={request.id} request={request} responses={responses.filter((response) => response.request_id === request.id)} saving={saving} onSelect={selectResponse} />)}
      {(view === "artist" ? market.length === 0 : requests.length === 0) ? <p className="rounded-[20px] border border-dashed border-line bg-bg p-6 text-center text-sm font-bold text-muted">{view === "artist" ? "目前没有符合条件的公开需求。" : "还没有公开发布需求，可从发布需求页面开始。"}</p> : null}
    </div>
  </section>;
}

function PriceRange({ count, low, high }: { count: number; low: number | null; high: number | null }) {
  return <div className="flex flex-wrap gap-2 text-xs font-black"><span className="rounded-pill bg-white px-3 py-2"><UsersRound size={14} className="mr-1 inline text-primary" />{count} 位画师响应</span><span className="rounded-pill bg-white px-3 py-2"><CircleDollarSign size={14} className="mr-1 inline text-primary" />{count === 0 ? "暂无报价" : low === high ? `当前 ¥${low}` : `¥${low}–¥${high}`}</span></div>;
}

function ArtistMarketCard({ request, services, saving, onSubmit }: { request: MarketRequest; services: Service[]; saving: boolean; onSubmit: (requestId: string, serviceId: string, packageId: string, quote: number, days: number, note: string) => Promise<void> }) {
  const matching = useMemo(() => services.filter((service) => !request.service_type || service.service_type.includes(request.service_type) || request.service_type.includes(service.service_type)), [services, request.service_type]);
  const available = matching.length > 0 ? matching : services;
  const [serviceId, setServiceId] = useState(available[0]?.id ?? "");
  const selectedService = available.find((service) => service.id === serviceId) ?? available[0];
  const [packageId, setPackageId] = useState(selectedService?.packages[0]?.id ?? "");
  const selectedPackage = selectedService?.packages.find((pack) => pack.id === packageId) ?? selectedService?.packages[0];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSubmit(request.request_id, serviceId, packageId || selectedPackage?.id || "", Number(form.get("quote")), Number(form.get("days")), String(form.get("note")));
  }

  return <article className="rounded-[22px] border border-line bg-bg p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="rounded-pill bg-primary/12 px-3 py-1 text-xs font-black text-primary">{request.service_type}</span><h3 className="mt-3 font-display text-2xl font-black">{request.title}</h3></div><PriceRange count={Number(request.response_count)} low={request.lowest_quote} high={request.highest_quote} /></div><p className="mt-3 text-sm font-semibold leading-6 text-muted">{request.brief}</p><div className="mt-4 flex flex-wrap gap-3 text-xs font-black text-muted"><span>预算 ¥{request.budget_min}–¥{request.budget_max}</span><span>{request.usage_scope === "personal" ? "个人使用" : "商业／买断审核"}</span><span><Clock3 size={13} className="mr-1 inline" />{new Date(request.collection_ends_at).toLocaleDateString("zh-CN")} 截止</span></div>
    <form onSubmit={handleSubmit} className="mt-5 grid gap-3 rounded-[18px] bg-white p-4 md:grid-cols-2 xl:grid-cols-5">
      <label className="text-xs font-black">关联服务<select value={serviceId} onChange={(event) => { setServiceId(event.target.value); const next = available.find((item) => item.id === event.target.value); setPackageId(next?.packages[0]?.id ?? ""); }} className="mt-2 h-10 w-full rounded-[12px] border border-line px-3 text-sm">{available.map((service) => <option key={service.id} value={service.id}>{service.title}</option>)}</select></label>
      <label className="text-xs font-black">关联套餐<select value={packageId || selectedPackage?.id || ""} onChange={(event) => setPackageId(event.target.value)} className="mt-2 h-10 w-full rounded-[12px] border border-line px-3 text-sm">{selectedService?.packages.map((pack) => <option key={pack.id} value={pack.id}>{pack.title} · ¥{pack.price}</option>)}</select></label>
      <label className="text-xs font-black">最终报价<input name="quote" type="number" min="1" required defaultValue={selectedPackage?.price ?? request.budget_min ?? 299} className="mt-2 h-10 w-full rounded-[12px] border border-line px-3 text-sm" /></label>
      <label className="text-xs font-black">交付天数<input name="days" type="number" min="1" required defaultValue={selectedPackage?.delivery_days ?? 14} className="mt-2 h-10 w-full rounded-[12px] border border-line px-3 text-sm" /></label>
      <label className="text-xs font-black md:col-span-2 xl:col-span-5">接稿说明<textarea name="note" required minLength={10} rows={2} placeholder="说明创作方案、档期和与需求匹配的经验" className="mt-2 w-full rounded-[12px] border border-line p-3 text-sm" /></label>
      <Button type="submit" disabled={saving || available.length === 0 || !selectedPackage} className="md:col-span-2 xl:col-span-5"><Send size={15} />{request.my_response_id ? "更新接稿方案" : "提交接稿方案"}</Button>
    </form>
  </article>;
}

function ClientPublicRequestCard({ request, responses, saving, onSelect }: { request: ClientRequest; responses: ResponseItem[]; saving: boolean; onSelect: (id: string) => Promise<void> }) {
  const valid = responses.filter((response) => response.status === "submitted" && new Date(response.valid_until) > new Date());
  const prices = valid.map((item) => Number(item.quote_amount));
  return <article className="rounded-[22px] border border-line bg-bg p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="rounded-pill bg-white px-3 py-1 text-xs font-black text-primary">{moderationLabels[request.moderation_status] ?? request.moderation_status}</span><h3 className="mt-3 font-display text-2xl font-black">{request.title}</h3></div><PriceRange count={valid.length} low={prices.length ? Math.min(...prices) : null} high={prices.length ? Math.max(...prices) : null} /></div>{request.moderation_reason ? <p className="mt-3 rounded-[14px] bg-white px-3 py-2 text-xs font-bold text-muted">审核说明：{request.moderation_reason}</p> : null}<p className="mt-3 text-sm font-semibold leading-6 text-muted">{request.brief}</p>
    <div className="mt-4 grid gap-3 md:grid-cols-2">{responses.map((response) => <div key={response.id} className={`rounded-[18px] border p-4 ${response.status === "selected" ? "border-primary bg-primary/10" : "border-line bg-white"}`}><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-black">{response.artist_name}</p><p className="mt-1 text-xs font-bold text-muted">{response.service_title} · {response.package_title}</p></div><strong className="text-lg">¥{response.quote_amount}</strong></div><p className="mt-3 text-xs font-semibold leading-5 text-muted">{response.proposal_note}</p><div className="mt-3 flex gap-3 text-xs font-black text-muted"><span><CalendarDays size={13} className="mr-1 inline" />{response.delivery_days} 天</span><span>{response.revision_limit} 次修改</span></div>{response.status === "submitted" && !request.selected_response_id ? <Button type="button" disabled={saving} className="mt-4 w-full" onClick={() => onSelect(response.id)}><CheckCircle2 size={15} />选择该画师</Button> : <p className="mt-4 inline-flex items-center gap-2 text-xs font-black text-primary"><BadgeCheck size={14} />{response.status === "selected" ? "已选中并生成订单" : response.status === "not_selected" ? "未选中" : response.status}</p>}</div>)}</div>
  </article>;
}
