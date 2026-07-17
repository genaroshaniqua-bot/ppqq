"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, BriefcaseBusiness, CalendarDays, CheckCircle2, CircleDollarSign, Clock3, CreditCard, FileCheck2, Info, LoaderCircle, Plus, Search, Send, SlidersHorizontal, Sparkles, UserRound, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { OrderMessagePanel } from "@/components/commissions/OrderMessagePanel";
import { OrderStatusTimeline } from "@/components/commissions/OrderStatusTimeline";
import { ArtistReviewForm } from "@/components/commissions/ArtistReviewForm";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { COMMISSION_DRAFT_STORAGE_KEY, type CommissionDraft } from "@/lib/commission-draft";
import { cn } from "@/lib/utils";

type Service = {
  id: string;
  artist_id: string;
  title: string;
  description: string;
  service_type: string;
  base_price: number;
  revision_limit: number;
  delivery_days: number;
  is_active: boolean;
  artist_name?: string;
};

type CommissionRequest = {
  id: string;
  client_id: string;
  service_id: string | null;
  title: string;
  brief: string;
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  usage_scope: string;
  status: "pending_artist" | "quoted" | "rejected" | "confirmed";
  quoted_amount: number | null;
  artist_response_note: string | null;
  created_at: string;
};

type CommissionOrder = {
  id: string;
  request_id: string;
  status: "pending_deposit" | "in_progress" | "draft_review" | "revision_requested" | "final_review" | "pending_balance" | "completed" | "cancelled" | "disputed";
  quoted_amount: number | null;
  deposit_amount: number | null;
  balance_amount: number | null;
  deposit_status: "unpaid" | "pending" | "paid" | "failed" | "refunding" | "refunded";
  balance_status: "unpaid" | "pending" | "paid" | "failed" | "refunding" | "refunded";
  created_at: string;
};

type OrderDelivery = {
  id: string;
  order_id: string;
  kind: "draft" | "final";
  note: string | null;
  decision: "approved" | "revision_requested" | null;
  decision_note: string | null;
  created_at: string;
};

type OrderDispute = {
  id: string;
  order_id: string;
  reason: string;
  status: "open" | "reviewing" | "resolved";
  resolution: string | null;
  created_at: string;
};

type OrderNotification = { id: string; related_order_id: string | null; read_at: string | null };

export type CommissionPanelView = "all" | "client" | "artist" | "admin";

const serviceNamePresets = ["OC 头像精绘", "角色半身立绘", "角色全身立绘", "角色设定卡", "Live2D 模型制作", "表情徽章套组", "宣传海报设计", "周边视觉设计", "自定义服务"];
const GUIDE_STORAGE_PREFIX = "weiming-commission-guide";

type Feedback = { text: string; tone: "success" | "error" } | null;

export function CommissionBackendPanel({ view = "all" }: { view?: CommissionPanelView }) {
  const [userId, setUserId] = useState("");
  const [canPublish, setCanPublish] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [requests, setRequests] = useState<CommissionRequest[]>([]);
  const [orders, setOrders] = useState<CommissionOrder[]>([]);
  const [deliveries, setDeliveries] = useState<OrderDelivery[]>([]);
  const [disputes, setDisputes] = useState<OrderDispute[]>([]);
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [guideDismissed, setGuideDismissed] = useState(false);
  const [draft, setDraft] = useState<CommissionDraft | null>(null);
  const [serviceQuery, setServiceQuery] = useState("");
  const [serviceType, setServiceType] = useState("全部类型");
  const [serviceSort, setServiceSort] = useState<"推荐排序" | "价格从低到高" | "交付最快">("推荐排序");
  const [serviceName, setServiceName] = useState(serviceNamePresets[0]);
  const showClient = view === "all" || view === "client";
  const showArtist = view === "all" || view === "artist";

  const clearFeedback = () => setFeedback(null);
  const showSuccess = (text: string) => setFeedback({ text, tone: "success" });
  const showError = (text: string) => setFeedback({ text, tone: "error" });

  const loadData = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setUserId(user.id);

    const [{ data: artist, error: artistError }, { data: account, error: accountError }, { data: serviceRows, error: serviceError }, { data: requestRows, error: requestError }, { data: orderRows, error: orderError }, { data: deliveryRows, error: deliveryError }, { data: disputeRows, error: disputeError }, { data: notificationRows, error: notificationError }] = await Promise.all([
      supabase.from("artist_profiles").select("review_status").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("role").eq("id", user.id).single(),
      supabase.from("artist_services").select("id, artist_id, title, description, service_type, base_price, revision_limit, delivery_days, is_active").eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("commission_requests").select("id, client_id, service_id, title, brief, budget_min, budget_max, deadline, usage_scope, status, quoted_amount, artist_response_note, created_at").order("created_at", { ascending: false }),
      supabase.rpc("get_my_commission_orders"),
      supabase.from("order_deliveries").select("id, order_id, kind, note, decision, decision_note, created_at").order("created_at", { ascending: false }),
      supabase.from("order_disputes").select("id, order_id, reason, status, resolution, created_at").order("created_at", { ascending: false }),
      supabase.from("notifications").select("id, related_order_id, read_at").is("read_at", null).order("created_at", { ascending: false })
    ]);
    const dataError = artistError ?? accountError ?? serviceError ?? requestError ?? orderError ?? deliveryError ?? disputeError ?? notificationError;
    if (dataError) throw dataError;

    const artistIds = [...new Set((serviceRows ?? []).map((service) => service.artist_id))];
    let profileRows: Array<{ id: string; display_name: string }> = [];
    if (artistIds.length) {
      const { data, error } = await supabase.from("profiles").select("id, display_name").in("id", artistIds);
      if (error) throw error;
      profileRows = data ?? [];
    }
    const artistNames = new Map(profileRows.map((profile) => [profile.id, profile.display_name]));

    setCanPublish(artist?.review_status === "approved");
    setIsAdmin(account?.role === "admin");
    setServices((serviceRows ?? []).map((service) => ({ ...service, artist_name: artistNames.get(service.artist_id) ?? "WEIMING 画师" })) as Service[]);
    setRequests((requestRows ?? []) as CommissionRequest[]);
    setOrders((orderRows ?? []) as CommissionOrder[]);
    setDeliveries((deliveryRows ?? []) as OrderDelivery[]);
    setDisputes((disputeRows ?? []) as OrderDispute[]);
    setNotifications((notificationRows ?? []) as OrderNotification[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData().catch((error) => {
      setFeedback({ text: error instanceof Error ? error.message : "真实约稿数据加载失败", tone: "error" });
      setLoading(false);
    });
  }, [loadData]);

  useEffect(() => {
    setGuideDismissed(window.localStorage.getItem(`${GUIDE_STORAGE_PREFIX}-${view}`) === "dismissed");
  }, [view]);

  useEffect(() => {
    if (feedback?.tone !== "success") return;
    const timer = window.setTimeout(() => setFeedback(null), 7000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  function dismissGuide() {
    window.localStorage.setItem(`${GUIDE_STORAGE_PREFIX}-${view}`, "dismissed");
    setGuideDismissed(true);
  }

  useEffect(() => {
    if (!showClient) return;
    const raw = window.localStorage.getItem(COMMISSION_DRAFT_STORAGE_KEY);
    if (!raw) return;
    try {
      setDraft(JSON.parse(raw) as CommissionDraft);
    } catch {
      window.localStorage.removeItem(COMMISSION_DRAFT_STORAGE_KEY);
    }
  }, [showClient]);

  async function publishService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;
    const formElement = event.currentTarget;
    setSaving(true);
    clearFeedback();
    const form = new FormData(formElement);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("artist_services").insert({
      artist_id: userId,
      title: String(form.get(serviceName === "自定义服务" ? "customTitle" : "title") ?? "").trim(),
      description: String(form.get("description") ?? "").trim(),
      service_type: String(form.get("serviceType") ?? "角色插画"),
      base_price: Number(form.get("basePrice")),
      revision_limit: Number(form.get("revisionLimit")),
      delivery_days: Number(form.get("deliveryDays")),
      is_active: true
    });
    setSaving(false);
    if (error) {
      showError(error.message);
      return;
    }
    formElement.reset();
    setServiceName(serviceNamePresets[0]);
    showSuccess("服务已发布。委托人现在可以在服务列表中查看并发起约稿。");
    await loadData();
  }

  function clearDraft() {
    window.localStorage.removeItem(COMMISSION_DRAFT_STORAGE_KEY);
    setDraft(null);
  }

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId || !selectedService) return;
    setSaving(true);
    clearFeedback();
    const form = new FormData(event.currentTarget);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("commission_requests").insert({
      client_id: userId,
      service_id: selectedService.id,
      title: String(form.get("requestTitle") ?? "").trim(),
      brief: String(form.get("brief") ?? "").trim(),
      budget_min: Number(form.get("budgetMin")),
      budget_max: Number(form.get("budgetMax")),
      deadline: String(form.get("deadline") ?? "") || null,
      usage_scope: String(form.get("usageScope") ?? "personal"),
      allow_public_display: form.get("allowPublic") === "on",
      allow_ai_training: false
    });
    setSaving(false);
    if (error) {
      showError(error.message);
      return;
    }
    setSelectedService(null);
    window.localStorage.removeItem(COMMISSION_DRAFT_STORAGE_KEY);
    setDraft(null);
    showSuccess("委托已发送。下一步等待画师确认范围并发送报价。");
    await loadData();
  }

  async function respondToRequest(requestId: string, decision: "quoted" | "rejected", amount?: number, note?: string) {
    setSaving(true);
    clearFeedback();
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("artist_respond_to_commission", {
      target_request_id: requestId,
      decision,
      quote_amount: amount ?? null,
      response_note: note ?? null
    });
    setSaving(false);
    if (error) { showError(error.message); return; }
    showSuccess(decision === "quoted" ? "报价已发送。下一步等待委托人确认。" : "委托已拒绝，对方会看到处理结果。");
    await loadData();
  }

  async function confirmQuote(requestId: string) {
    setSaving(true);
    clearFeedback();
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("confirm_commission_quote", { target_request_id: requestId });
    setSaving(false);
    if (error) { showError(error.message); return; }
    showSuccess("报价已确认。正式订单已生成，下一步支付模拟定金。");
    await loadData();
  }

  async function payDeposit(orderId: string) {
    setSaving(true);
    clearFeedback();
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("simulate_commission_deposit", { target_order_id: orderId });
    setSaving(false);
    if (error) { showError(error.message); return; }
    showSuccess("模拟定金支付成功。画师现在可以开始创作并提交草稿。");
    await loadData();
  }

  async function submitDelivery(orderId: string, kind: "draft" | "final", note: string) {
    setSaving(true);
    clearFeedback();
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("submit_commission_delivery", {
      target_order_id: orderId,
      delivery_kind: kind,
      delivery_note: note
    });
    setSaving(false);
    if (error) { showError(error.message); return; }
    showSuccess(kind === "draft" ? "草稿已提交。下一步等待委托人确认或提出修改。" : "成稿已提交。下一步等待委托人验收。");
    await loadData();
  }

  async function reviewDelivery(deliveryId: string, decision: "approved" | "revision_requested", note: string) {
    setSaving(true);
    clearFeedback();
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("review_commission_delivery", {
      target_delivery_id: deliveryId,
      review_decision: decision,
      review_note: note
    });
    setSaving(false);
    if (error) { showError(error.message); return; }
    showSuccess(decision === "approved" ? "已确认本次交付，订单进入下一阶段。" : "修改要求已发送，下一步等待画师提交修改版。");
    await loadData();
  }

  async function payBalance(orderId: string) {
    setSaving(true);
    clearFeedback();
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("simulate_commission_balance", { target_order_id: orderId });
    setSaving(false);
    if (error) { showError(error.message); return; }
    showSuccess("模拟尾款支付成功。订单已完成，现在可以评价本次合作。");
    await loadData();
  }

  async function openDispute(orderId: string, reason: string) {
    setSaving(true);
    clearFeedback();
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("open_commission_dispute", { target_order_id: orderId, dispute_reason: reason });
    setSaving(false);
    if (error) { showError(error.message); return; }
    showSuccess("争议已提交，订单已冻结。管理员会根据双方记录进行处理。");
    await loadData();
  }

  async function resolveDispute(disputeId: string, action: "continue" | "refund" | "close", note: string) {
    setSaving(true);
    clearFeedback();
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("resolve_commission_dispute", { target_dispute_id: disputeId, resolution_action: action, resolution_note: note });
    setSaving(false);
    if (error) { showError(error.message); return; }
    showSuccess(action === "refund" ? "模拟退款已完成，订单已经关闭。" : action === "continue" ? "仲裁完成，订单恢复履约。" : "仲裁完成，订单已经关闭。");
    await loadData();
  }

  const myRequests = useMemo(() => requests.filter((request) => request.client_id === userId), [requests, userId]);
  const receivedRequests = useMemo(() => {
    const ownServiceIds = new Set(services.filter((service) => service.artist_id === userId).map((service) => service.id));
    return requests.filter((request) => request.service_id && ownServiceIds.has(request.service_id));
  }, [requests, services, userId]);
  const serviceTypes = useMemo(
    () => ["全部类型", ...Array.from(new Set(services.map((service) => service.service_type)))],
    [services]
  );
  const filteredServices = useMemo(() => {
    const keyword = serviceQuery.trim().toLowerCase();
    const matched = services.filter((service) => {
      const matchesType = serviceType === "全部类型" || service.service_type === serviceType;
      const matchesQuery = !keyword || [service.title, service.description, service.artist_name, service.service_type]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword);
      return matchesType && matchesQuery;
    });
    return [...matched].sort((left, right) => {
      if (serviceSort === "价格从低到高") return Number(left.base_price) - Number(right.base_price);
      if (serviceSort === "交付最快") return left.delivery_days - right.delivery_days;
      return Number(left.base_price) - Number(right.base_price) || left.delivery_days - right.delivery_days;
    });
  }, [serviceQuery, serviceSort, serviceType, services]);
  const heading = view === "client" ? "我的委托中心" : view === "artist" ? "画师委托工作台" : view === "admin" ? "委托争议处理" : "真实约稿工作台";
  const description = view === "client"
    ? "发起委托、确认报价、审核交付并完成模拟付款。"
    : view === "artist"
      ? "发布服务、响应需求并提交草稿与最终交付。"
      : view === "admin"
        ? "查看平台委托状态，并处理双方提交的争议。"
        : "服务、委托需求与双方记录均保存至 Supabase。";
  const activeDisputes = disputes.filter((dispute) => dispute.status !== "resolved");
  const visibleOrders = view === "admin"
    ? orders.filter((order) => activeDisputes.some((dispute) => dispute.order_id === order.id))
    : orders;
  const currentOrders = visibleOrders.filter((order) => !["completed", "cancelled"].includes(order.status));
  const archivedOrders = visibleOrders.filter((order) => ["completed", "cancelled"].includes(order.status));
  const actionableOrders = visibleOrders.filter((order) => {
    if (view === "client") return ["pending_deposit", "draft_review", "final_review", "pending_balance"].includes(order.status);
    if (view === "artist") return ["in_progress", "revision_requested"].includes(order.status);
    if (view === "admin") return order.status === "disputed";
    return !["completed", "cancelled"].includes(order.status);
  }).length;

  if (loading) {
    return <section className="mt-7 flex min-h-32 items-center justify-center rounded-card border border-line bg-white shadow-soft"><LoaderCircle className="animate-spin text-primary" /></section>;
  }

  return (
    <section className="mt-7 rounded-[32px] border border-line bg-white p-5 shadow-soft sm:p-6" aria-labelledby="real-commission-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-primary">{showClient && !showArtist ? "Commission discovery" : "Supabase Commission"}</p>
          <h2 id="real-commission-heading" className="mt-1 font-display text-3xl font-black">{heading}</h2>
          <p className="mt-2 text-sm font-semibold text-muted">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actionableOrders > 0 ? <span className="inline-flex items-center gap-2 rounded-pill bg-primary/12 px-4 py-2 text-xs font-black text-primary"><Clock3 size={15} />{actionableOrders} 项等待你处理</span> : null}
          <span className="inline-flex items-center gap-2 rounded-pill bg-lime px-4 py-2 text-xs font-black text-ink"><CheckCircle2 size={16} />真实后端已连接</span>
        </div>
      </div>

      {feedback ? <div role={feedback.tone === "error" ? "alert" : "status"} className={cn("mt-5 flex items-start gap-3 rounded-[18px] border px-4 py-3 text-sm font-bold", feedback.tone === "error" ? "border-danger/25 bg-danger/5 text-danger" : "border-primary/25 bg-primary/8 text-ink")}><span className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full", feedback.tone === "error" ? "bg-danger text-white" : "bg-primary text-white")}>{feedback.tone === "error" ? <XCircle size={14} /> : <CheckCircle2 size={14} />}</span><p className="leading-6">{feedback.text}</p></div> : null}

      {!guideDismissed ? <RoleQuickGuide view={view} onDismiss={dismissGuide} /> : <button type="button" onClick={() => setGuideDismissed(false)} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-pill border border-line bg-bg px-4 text-xs font-black text-muted transition hover:border-primary hover:text-ink"><Info size={15} />再次查看使用流程</button>}

      {showClient && draft ? <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-bold text-ink"><p>已载入需求草稿「{draft.title}」。请选择一项真实服务，系统会自动带入标题、预算和需求说明。</p><Button type="button" variant="secondary" onClick={clearDraft}>清除草稿</Button></div> : null}

      {showClient ? (
        <div className="mt-6 grid gap-3 rounded-[22px] bg-bg p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-4">
          <label className="flex min-h-12 items-center gap-3 rounded-[16px] border border-line bg-white px-4 focus-within:border-primary">
            <Search size={18} className="text-muted" aria-hidden="true" />
            <span className="sr-only">搜索画师、服务或类型</span>
            <input
              value={serviceQuery}
              onChange={(event) => setServiceQuery(event.target.value)}
              placeholder="搜索画师、服务或类型"
              className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-muted"
            />
          </label>
          <label className="flex min-h-12 items-center gap-2 rounded-[16px] border border-line bg-white px-4 text-sm font-black">
            <SlidersHorizontal size={17} aria-hidden="true" />
            <span className="sr-only">服务排序</span>
            <select value={serviceSort} onChange={(event) => setServiceSort(event.target.value as typeof serviceSort)} className="bg-transparent outline-none">
              <option>推荐排序</option>
              <option>价格从低到高</option>
              <option>交付最快</option>
            </select>
          </label>
          <div className="flex gap-2 overflow-x-auto sm:col-span-2" aria-label="服务类型筛选">
            {serviceTypes.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={serviceType === item}
                onClick={() => setServiceType(item)}
                className={cn(
                  "min-h-10 shrink-0 rounded-pill px-4 text-xs font-black transition",
                  serviceType === item ? "bg-ink text-white" : "border border-line bg-white text-muted hover:border-primary hover:text-ink"
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {showArtist && canPublish ? (
        <form onSubmit={publishService} className="mt-6 rounded-card border border-line bg-white p-5">
          <div className="flex items-center gap-3"><BriefcaseBusiness className="text-purple" /><h3 className="font-display text-2xl font-black">发布画师服务</h3></div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm font-black">服务名称<select name="title" value={serviceName} onChange={(event) => setServiceName(event.target.value)} className="mt-2 h-11 w-full rounded-[14px] border border-line bg-bg px-3 outline-none focus:border-primary">{serviceNamePresets.map((item) => <option key={item}>{item}</option>)}</select></label>
            {serviceName === "自定义服务" ? <label className="text-sm font-black">自定义名称<input name="customTitle" required minLength={2} placeholder="输入你的服务名称" className="mt-2 h-11 w-full rounded-[14px] border border-line bg-bg px-3 outline-none focus:border-primary" /></label> : null}
            <label className="text-sm font-black">服务类型<select name="serviceType" className="mt-2 h-11 w-full rounded-[14px] border border-line bg-bg px-3 outline-none"><option>角色插画</option><option>头像</option><option>立绘</option><option>Live2D</option><option>周边设计</option></select></label>
            <label className="text-sm font-black">起步价<input name="basePrice" type="number" min="1" required defaultValue="299" className="mt-2 h-11 w-full rounded-[14px] border border-line bg-bg px-3 outline-none" /></label>
            <label className="text-sm font-black">交付天数<input name="deliveryDays" type="number" min="1" required defaultValue="14" className="mt-2 h-11 w-full rounded-[14px] border border-line bg-bg px-3 outline-none" /></label>
            <label className="text-sm font-black">修改次数<input name="revisionLimit" type="number" min="0" required defaultValue="2" className="mt-2 h-11 w-full rounded-[14px] border border-line bg-bg px-3 outline-none" /></label>
            <label className="text-sm font-black md:col-span-2 xl:col-span-3">服务说明<input name="description" required placeholder="说明服务范围、交付内容与授权规则" className="mt-2 h-11 w-full rounded-[14px] border border-line bg-bg px-3 outline-none focus:border-primary" /></label>
          </div>
          <Button type="submit" disabled={saving} className="mt-4"><Plus size={16} />发布真实服务</Button>
        </form>
      ) : showArtist ? <p className="mt-6 rounded-card border border-dashed border-line bg-white p-5 text-sm font-bold text-muted">通过画师入驻审核后即可发布真实服务。</p> : null}

      {showClient ? <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {filteredServices.map((service) => (
          <article key={service.id} className="group flex min-h-[250px] flex-col rounded-card border border-line bg-white p-5 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-soft">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black text-purple">{service.artist_name} · {service.service_type}</p><h3 className="mt-1 font-display text-xl font-black">{service.title}</h3></div><span className="shrink-0 rounded-pill bg-lime px-3 py-1.5 text-xs font-black">¥{service.base_price} 起</span></div>
            <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-muted">{service.description}</p>
            <div className="mt-auto flex flex-wrap gap-2 pt-5 text-xs font-black text-muted"><span className="inline-flex items-center gap-1 rounded-pill bg-bg px-3 py-1.5"><CalendarDays size={14} />{service.delivery_days} 天交付</span><span className="rounded-pill bg-bg px-3 py-1.5">含 {service.revision_limit} 次修改</span><span className="rounded-pill bg-primary/10 px-3 py-1.5 text-primary">默认禁用 AI 训练</span></div>
            <Link href={`/commissions/${service.id}`} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-pill bg-ink px-5 py-3 text-sm font-black text-white shadow-soft transition hover:bg-primary hover:text-ink"><Send size={16} />查看套餐与详情</Link>
          </article>
        ))}
        {filteredServices.length === 0 ? <p className="rounded-card border border-dashed border-line bg-bg p-6 text-sm font-bold text-muted">没有符合当前条件的真实服务，请调整搜索或筛选条件。</p> : null}
      </div> : null}

      {showClient && selectedService ? (
        <form onSubmit={submitRequest} className="mt-6 rounded-card border border-purple/25 bg-white p-5">
          <div className="flex items-center gap-3"><UserRound className="text-purple" /><div><p className="text-xs font-black text-purple">委托给 {selectedService.artist_name}</p><h3 className="font-display text-2xl font-black">{selectedService.title}</h3></div></div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-black">需求标题<input name="requestTitle" required defaultValue={draft?.title} placeholder="我的 OC 半身立绘" className="mt-2 h-11 w-full rounded-[14px] border border-line bg-bg px-3 outline-none" /></label>
            <label className="text-sm font-black">期望日期<input name="deadline" type="date" className="mt-2 h-11 w-full rounded-[14px] border border-line bg-bg px-3 outline-none" /></label>
            <label className="text-sm font-black">最低预算<input name="budgetMin" type="number" min="1" required defaultValue={draft?.budgetMin ?? selectedService.base_price} className="mt-2 h-11 w-full rounded-[14px] border border-line bg-bg px-3 outline-none" /></label>
            <label className="text-sm font-black">最高预算<input name="budgetMax" type="number" min="1" required defaultValue={draft?.budgetMax ?? selectedService.base_price * 2} className="mt-2 h-11 w-full rounded-[14px] border border-line bg-bg px-3 outline-none" /></label>
            <label className="text-sm font-black">使用范围<select name="usageScope" defaultValue={draft?.usageScope ?? "personal"} className="mt-2 h-11 w-full rounded-[14px] border border-line bg-bg px-3 outline-none"><option value="personal">个人使用</option><option value="commercial">商业使用</option></select></label>
            <label className="flex items-center gap-2 self-end rounded-[14px] bg-bg px-4 py-3 text-sm font-black"><input name="allowPublic" type="checkbox" />允许画师公开展示成稿</label>
            <label className="text-sm font-black md:col-span-2">详细需求<textarea name="brief" required minLength={20} rows={4} defaultValue={draft ? `${draft.brief}\n\n服务类别：${draft.category}；期望交付：${draft.deadlineLabel}；合作偏好：${draft.requirements.join("、") || "无"}` : undefined} placeholder="描述角色设定、构图、服装、表情、授权和交付要求" className="mt-2 w-full rounded-[14px] border border-line bg-bg p-3 outline-none" /></label>
          </div>
          <div className="mt-4 flex gap-3"><Button type="submit" disabled={saving}><Send size={16} />提交真实委托</Button><Button type="button" variant="secondary" onClick={() => setSelectedService(null)}>取消</Button></div>
        </form>
      ) : null}

      <div className={cn("mt-6 grid gap-4", showClient && showArtist && "lg:grid-cols-2")}>
        {showClient ? <RequestList title="我发出的委托" items={myRequests} mode="client" saving={saving} onRespond={respondToRequest} onConfirm={confirmQuote} /> : null}
        {showArtist ? <RequestList title="我收到的委托" items={receivedRequests} mode="artist" saving={saving} onRespond={respondToRequest} onConfirm={confirmQuote} /> : null}
        {view === "admin" && activeDisputes.length === 0 ? <p className="rounded-card border border-dashed border-line bg-white p-5 text-sm font-semibold text-muted">当前没有等待管理员处理的委托争议。</p> : null}
      </div>

      <div className="mt-6 rounded-card border border-line bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><FileCheck2 className="text-primary" /><div><h3 className="font-display text-xl font-black">当前约稿订单</h3><p className="mt-1 text-xs font-semibold text-muted">需要继续处理的订单优先显示。</p></div></div><span className="rounded-pill bg-bg px-3 py-1 text-xs font-black text-muted">{currentOrders.length} 个进行中</span></div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {currentOrders.map((order) => <OrderWorkflowCard key={order.id} mode={view} order={order} requestDeadline={requests.find((request) => request.id === order.request_id)?.deadline ?? null} userId={userId} unreadCount={notifications.filter((notification) => notification.related_order_id === order.id).length} onMessagesRead={loadData} deliveries={deliveries.filter((delivery) => delivery.order_id === order.id)} dispute={activeDisputes.find((dispute) => dispute.order_id === order.id) ?? null} isAdmin={isAdmin} saving={saving} onPayDeposit={payDeposit} onSubmit={submitDelivery} onReview={reviewDelivery} onPayBalance={payBalance} onOpenDispute={openDispute} onResolveDispute={resolveDispute} />)}
          {currentOrders.length === 0 ? <div className="rounded-[18px] border border-dashed border-line bg-bg p-5 lg:col-span-2"><p className="text-sm font-black text-ink">{view === "admin" ? "当前没有需要仲裁的订单" : view === "artist" ? "目前没有等待交付的订单" : archivedOrders.length > 0 ? "当前订单都已处理完成" : "你还没有正式约稿订单"}</p><p className="mt-1 text-xs font-semibold leading-5 text-muted">{view === "admin" ? "有用户发起争议后，冻结订单会自动出现在这里。" : view === "artist" ? "收到需求后先发送报价，委托人确认并支付定金后即可开始创作。" : "选择服务、发送需求并确认画师报价后，正式订单会显示在这里。"}</p>{view === "client" || view === "all" ? <Link href="/commissions" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-pill bg-ink px-4 text-xs font-black text-white">去选择服务<ArrowRight size={15} /></Link> : null}</div> : null}
        </div>
        {archivedOrders.length > 0 ? <details className="mt-4 rounded-[18px] border border-line bg-bg p-3"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-1 text-sm font-black text-muted"><span>历史订单</span><span className="rounded-pill bg-white px-3 py-1 text-xs">{archivedOrders.length} 个已结束</span></summary><div className="mt-4 grid gap-3 lg:grid-cols-2">{archivedOrders.map((order) => <OrderWorkflowCard key={order.id} mode={view} order={order} requestDeadline={requests.find((request) => request.id === order.request_id)?.deadline ?? null} userId={userId} unreadCount={notifications.filter((notification) => notification.related_order_id === order.id).length} onMessagesRead={loadData} deliveries={deliveries.filter((delivery) => delivery.order_id === order.id)} dispute={null} isAdmin={isAdmin} saving={saving} onPayDeposit={payDeposit} onSubmit={submitDelivery} onReview={reviewDelivery} onPayBalance={payBalance} onOpenDispute={openDispute} onResolveDispute={resolveDispute} />)}</div></details> : null}
      </div>
    </section>
  );
}

function RoleQuickGuide({ view, onDismiss }: { view: CommissionPanelView; onDismiss: () => void }) {
  const role = view === "artist" ? "画师" : view === "admin" ? "管理员" : "委托人";
  const steps = view === "artist"
    ? ["发布服务并确认范围", "报价后等待定金", "提交草稿与修改版", "提交成稿并等待结清"]
    : view === "admin"
      ? ["查看被冻结订单", "核对消息与履约记录", "填写仲裁依据", "继续履约、退款或关闭"]
      : ["选择服务与套餐", "确认报价并付定金", "确认草稿与成稿", "支付尾款并评价"];
  const destination = view === "artist" ? "/artist/commissions" : view === "admin" ? "/admin/disputes" : "/commissions";

  return <aside className="mt-5 overflow-hidden rounded-[22px] border border-primary/20 bg-ink text-white shadow-soft" aria-label={`${role}首次使用流程`}>
    <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
      <div className="max-w-xl"><p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-lime"><Sparkles size={15} />{role}快速开始</p><h3 className="mt-2 font-display text-2xl font-black">只看当前一步，其余交给订单状态推进</h3><p className="mt-2 text-sm font-semibold leading-6 text-white/62">每完成一步，订单会自动提示下一位需要操作的人。历史进度、付款和消息可以在订单详情中展开查看。</p></div>
      <button type="button" onClick={onDismiss} className="min-h-10 rounded-pill border border-white/15 px-4 text-xs font-black text-white/72 transition hover:border-lime hover:text-lime">我知道了</button>
    </div>
    <ol className="grid border-t border-white/10 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((step, index) => <li key={step} className="flex items-center gap-3 border-white/10 px-5 py-4 sm:border-r"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-lime text-xs font-black text-ink">{index + 1}</span><span className="text-sm font-black">{step}</span></li>)}
    </ol>
    <Link href={destination} className="flex min-h-12 items-center justify-center gap-2 border-t border-white/10 bg-white/[0.05] px-5 text-sm font-black text-lime transition hover:bg-white/10">{view === "client" || view === "all" ? "浏览可委托服务" : "查看当前任务"}<ArrowRight size={16} /></Link>
  </aside>;
}

function getDeadlineInfo(deadline: string | null) {
  if (!deadline) return null;
  const target = new Date(`${deadline}T23:59:59`);
  const remainingDays = Math.ceil((target.getTime() - Date.now()) / 86_400_000);
  const dateLabel = target.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  if (remainingDays < 0) return { label: `期望日期已过 ${Math.abs(remainingDays)} 天`, overdue: true };
  if (remainingDays === 0) return { label: `期望今天完成 · ${dateLabel}`, overdue: false };
  return { label: `期望 ${dateLabel} · 还剩 ${remainingDays} 天`, overdue: false };
}

function RequestList({ title, items, mode, saving, onRespond, onConfirm }: { title: string; items: CommissionRequest[]; mode: "client" | "artist"; saving: boolean; onRespond: (id: string, decision: "quoted" | "rejected", amount?: number, note?: string) => Promise<void>; onConfirm: (id: string) => Promise<void> }) {
  const currentItems = items.filter((request) => request.status === "pending_artist" || request.status === "quoted");
  const archivedItems = items.filter((request) => request.status === "confirmed" || request.status === "rejected");
  return <div className="rounded-card border border-line bg-white p-5"><div className="flex items-center justify-between gap-3"><div><h3 className="font-display text-xl font-black">{title}</h3><p className="mt-1 text-xs font-semibold text-muted">等待处理的需求优先显示。</p></div><span className="rounded-pill bg-bg px-3 py-1 text-xs font-black text-muted">{currentItems.length} 条待处理</span></div><div className="mt-4 space-y-3">{currentItems.map((request) => <RequestCard key={request.id} request={request} mode={mode} saving={saving} onRespond={onRespond} onConfirm={onConfirm} />)}{currentItems.length === 0 ? <div className="rounded-[16px] border border-dashed border-line bg-bg p-4"><p className="text-sm font-black text-ink">{mode === "client" ? archivedItems.length ? "当前没有等待处理的委托" : "还没有发出委托" : "目前没有待处理需求"}</p><p className="mt-1 text-xs font-semibold leading-5 text-muted">{mode === "client" ? "从服务详情页选择套餐并填写需求，提交后会显示在这里。" : "发布服务后，委托人发来的指定需求会显示在这里。"}</p>{mode === "client" ? <Link href="/commissions" className="mt-3 inline-flex items-center gap-1 text-xs font-black text-primary">浏览服务<ArrowRight size={14} /></Link> : null}</div> : null}{archivedItems.length > 0 ? <details className="rounded-[16px] border border-line bg-bg p-3"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-black text-muted"><span>已处理需求</span><span className="rounded-pill bg-white px-3 py-1">{archivedItems.length} 条</span></summary><div className="mt-3 space-y-3">{archivedItems.map((request) => <RequestCard key={request.id} request={request} mode={mode} saving={saving} onRespond={onRespond} onConfirm={onConfirm} />)}</div></details> : null}</div></div>;
}

function RequestCard({ request, mode, saving, onRespond, onConfirm }: { request: CommissionRequest; mode: "client" | "artist"; saving: boolean; onRespond: (id: string, decision: "quoted" | "rejected", amount?: number, note?: string) => Promise<void>; onConfirm: (id: string) => Promise<void> }) {
  const [quote, setQuote] = useState(String(request.budget_max ?? request.budget_min ?? 299));
  const [note, setNote] = useState("");
  const statusLabel = { pending_artist: "待画师处理", quoted: "待确认报价", rejected: "画师已拒绝", confirmed: "已生成订单" }[request.status];
  const deadline = getDeadlineInfo(request.deadline);
  return <article className="rounded-[18px] bg-bg p-4"><div className="flex justify-between gap-3"><p className="text-sm font-black">{request.title}</p><span className="shrink-0 text-xs font-black text-primary">{statusLabel}</span></div><p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-muted">{request.brief}</p><div className="mt-3 flex flex-wrap gap-3 text-xs font-black text-muted"><span className="inline-flex items-center gap-1"><CircleDollarSign size={13} />¥{request.budget_min ?? "-"}–{request.budget_max ?? "-"}</span><span>{request.usage_scope === "commercial" ? "商业使用" : "个人使用"}</span>{deadline ? <span className={cn("inline-flex items-center gap-1", deadline.overdue && "text-danger")}><CalendarDays size={13} />{deadline.label}</span> : null}</div>
    {request.artist_response_note ? <p className="mt-3 rounded-[14px] bg-white px-3 py-2 text-xs font-semibold text-muted">画师说明：{request.artist_response_note}</p> : null}
    {mode === "artist" && request.status === "pending_artist" ? <div className="mt-4 grid gap-2"><input aria-label={`报价金额-${request.id}`} type="number" min="1" value={quote} onChange={(event) => setQuote(event.target.value)} className="h-10 rounded-[12px] border border-line bg-white px-3 text-sm font-bold outline-none" /><input aria-label={`报价说明-${request.id}`} value={note} onChange={(event) => setNote(event.target.value)} placeholder="说明交付范围和预计排期" className="h-10 rounded-[12px] border border-line bg-white px-3 text-sm font-bold outline-none" /><p className="text-[11px] font-semibold text-muted">报价必须关联当前服务；建议说明包含内容、排期和超出范围的计费方式。</p><div className="flex flex-wrap gap-2"><Button type="button" disabled={saving || Number(quote) <= 0} onClick={() => onRespond(request.id, "quoted", Number(quote), note)}><Send size={15} />{saving ? "正在发送" : "发送报价"}</Button><Button type="button" variant="secondary" disabled={saving} onClick={() => onRespond(request.id, "rejected", undefined, note)}><XCircle size={15} />无法承接</Button></div></div> : null}
    {mode === "client" && request.status === "quoted" ? <div className="mt-4 flex items-center justify-between gap-3 rounded-[14px] bg-lime/40 p-3"><p className="text-sm font-black">画师报价：¥{request.quoted_amount}</p><Button type="button" disabled={saving} onClick={() => onConfirm(request.id)}><CheckCircle2 size={15} />确认报价</Button></div> : null}
  </article>;
}

function getOrderNextAction(mode: CommissionPanelView, status: CommissionOrder["status"], approvedDraft: boolean) {
  if (mode === "admin") {
    return status === "disputed"
      ? { title: "现在轮到管理员：核对证据并完成仲裁", detail: "选择继续履约、模拟退款或关闭订单，并填写可追溯的仲裁依据。" }
      : { title: "管理员只读查看", detail: "订单进入争议状态后，才需要管理员介入处理。" };
  }

  const isClient = mode === "client" || mode === "all";
  const guidance: Record<CommissionOrder["status"], { title: string; detail: string }> = {
    pending_deposit: isClient
      ? { title: "现在轮到你：确认并支付模拟定金", detail: "支付后订单才会进入创作阶段，画师将可以提交草稿。" }
      : { title: "等待委托人支付定金", detail: "定金到账前无需开始交付，订单会保持冻结。" },
    in_progress: isClient
      ? { title: "画师正在创作", detail: approvedDraft ? "草稿已通过，等待画师提交最终成稿。" : "等待画师提交第一版草稿，你可以通过订单消息补充细节。" }
      : { title: approvedDraft ? "现在轮到你：提交最终成稿" : "现在轮到你：提交草稿", detail: approvedDraft ? "按已确认草稿完成成稿并写明交付内容。" : "说明构图、配色和需要委托人确认的重点。" },
    draft_review: isClient
      ? { title: "现在轮到你：审核草稿", detail: "可以通过草稿进入成稿阶段，或写明修改意见后退回。" }
      : { title: "等待委托人审核草稿", detail: "审核结果会在这里更新；需要补充说明可使用订单消息。" },
    revision_requested: isClient
      ? { title: "等待画师按意见修改", detail: "修改版提交后，你会再次进入审核环节。" }
      : { title: "现在轮到你：提交修改版", detail: "请逐项回应委托人的修改意见，再提交新的草稿或成稿。" },
    final_review: isClient
      ? { title: "现在轮到你：验收成稿", detail: "确认交付内容无误后通过验收；如有问题请写明具体修改项。" }
      : { title: "等待委托人验收成稿", detail: "验收通过后订单会进入尾款支付阶段。" },
    pending_balance: isClient
      ? { title: "现在轮到你：支付模拟尾款", detail: "尾款完成后订单结清，并开放画师评价入口。" }
      : { title: "等待委托人支付尾款", detail: "尾款完成后订单自动结清，交付和付款记录会被保存。" },
    completed: { title: "订单已完成", detail: isClient ? "你可以提交本次约稿评价，帮助其他委托人判断服务质量。" : "本次交付已结清，评价与订单记录会保留在账户中。" },
    disputed: { title: "订单已冻结，等待管理员仲裁", detail: "争议处理期间无法继续交付或支付，请在订单消息中保留必要证据。" },
    cancelled: { title: "订单已关闭", detail: "请核对下方定金与尾款状态；如有疑问可联系平台管理员。" }
  };

  return guidance[status];
}

function OrderWorkflowCard({ mode, order, requestDeadline, userId, unreadCount, onMessagesRead, deliveries, dispute, isAdmin, saving, onPayDeposit, onSubmit, onReview, onPayBalance, onOpenDispute, onResolveDispute }: { mode: CommissionPanelView; order: CommissionOrder; requestDeadline: string | null; userId: string; unreadCount: number; onMessagesRead: () => Promise<void>; deliveries: OrderDelivery[]; dispute: OrderDispute | null; isAdmin: boolean; saving: boolean; onPayDeposit: (id: string) => Promise<void>; onSubmit: (id: string, kind: "draft" | "final", note: string) => Promise<void>; onReview: (id: string, decision: "approved" | "revision_requested", note: string) => Promise<void>; onPayBalance: (id: string) => Promise<void>; onOpenDispute: (id: string, reason: string) => Promise<void>; onResolveDispute: (id: string, action: "continue" | "refund" | "close", note: string) => Promise<void> }) {
  const [deliveryNote, setDeliveryNote] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const approvedDraft = deliveries.some((delivery) => delivery.kind === "draft" && delivery.decision === "approved");
  const waitingDelivery = deliveries.find((delivery) => delivery.decision === null);
  const revisionDelivery = deliveries.find((delivery) => delivery.decision === "revision_requested");
  const nextKind: "draft" | "final" = order.status === "revision_requested" ? (revisionDelivery?.kind ?? "draft") : approvedDraft ? "final" : "draft";
  const nextAction = getOrderNextAction(mode, order.status, approvedDraft);
  const deadline = getDeadlineInfo(requestDeadline);
  const deliveryNoteRemaining = Math.max(0, 10 - deliveryNote.trim().length);
  const reviewNoteRemaining = Math.max(0, 5 - reviewNote.trim().length);
  const disputeReasonRemaining = Math.max(0, 10 - disputeReason.trim().length);
  const resolutionNoteRemaining = Math.max(0, 5 - resolutionNote.trim().length);
  const labels: Record<CommissionOrder["status"], string> = {
    pending_deposit: "待支付定金",
    in_progress: approvedDraft ? "待提交成稿" : "待提交草稿",
    draft_review: "草稿待审核",
    revision_requested: "等待画师修改",
    final_review: "成稿待验收",
    pending_balance: "待支付尾款",
    completed: "已完成",
    cancelled: "已取消",
    disputed: "争议处理中"
  };

  return (
    <article className="rounded-[20px] border border-line bg-bg p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-black">订单 {order.id.slice(0, 8)}</p>{deadline ? <p className={cn("mt-1 inline-flex items-center gap-1 text-[11px] font-bold", deadline.overdue ? "text-danger" : "text-muted")}><CalendarDays size={13} />{deadline.label}</p> : null}</div><div className="flex flex-wrap items-center gap-2">{unreadCount > 0 ? <span className="rounded-pill bg-purple/10 px-3 py-1 text-xs font-black text-purple">{unreadCount} 条新消息</span> : null}<span className="rounded-pill bg-white px-3 py-1 text-xs font-black text-primary">{labels[order.status]}</span></div></div>
      <div className="mt-4 rounded-[18px] border border-primary/20 bg-white p-4 shadow-[0_10px_30px_rgba(17,12,27,0.04)]" aria-live="polite">
        <p className="inline-flex items-center gap-2 text-sm font-black text-ink"><span className="grid size-7 place-items-center rounded-full bg-lime text-ink"><ArrowRight size={15} /></span>{nextAction.title}</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-muted">{nextAction.detail}</p>
      </div>

      {(mode === "client" || mode === "all") && order.status === "pending_deposit" && order.deposit_status === "unpaid" ? <Button type="button" disabled={saving} className="mt-4 w-full sm:w-auto" onClick={() => { if (window.confirm(`确认模拟支付定金 ¥${order.deposit_amount}？支付后画师即可开始创作。`)) void onPayDeposit(order.id); }}><CreditCard size={16} />{saving ? "正在支付" : `支付模拟定金 ¥${order.deposit_amount}`}</Button> : null}

      {(mode === "artist" || mode === "all") && (order.status === "in_progress" || order.status === "revision_requested") ? <div className="mt-4 grid gap-2"><textarea aria-label={`交付说明-${order.id}`} value={deliveryNote} onChange={(event) => setDeliveryNote(event.target.value)} rows={3} placeholder={nextKind === "draft" ? "说明草稿构图、配色和需要确认的细节" : "说明成稿文件、尺寸和交付内容"} className="rounded-[14px] border border-line bg-white p-3 text-sm font-semibold outline-none focus:border-primary" /><p className={cn("text-[11px] font-semibold", deliveryNoteRemaining > 0 ? "text-muted" : "text-primary")}>{deliveryNoteRemaining > 0 ? `还需填写 ${deliveryNoteRemaining} 个字，说明本次交付内容。` : "交付说明已完整，可以提交。"}</p><Button type="button" disabled={saving || deliveryNoteRemaining > 0} className="w-full sm:w-auto" onClick={() => onSubmit(order.id, nextKind, deliveryNote)}><Send size={16} />{saving ? "正在提交" : nextKind === "draft" ? "提交草稿" : "提交成稿"}</Button></div> : null}

      {(mode === "client" || mode === "all") && (order.status === "draft_review" || order.status === "final_review") && waitingDelivery ? <div className="mt-4 grid gap-2"><p className="rounded-[14px] bg-white p-3 text-sm font-semibold leading-6 text-muted"><span className="font-black text-ink">画师本次提交：</span>{waitingDelivery.note}</p><input aria-label={`审核意见-${order.id}`} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="通过可不填写；要求修改时请写明具体内容" className="h-11 rounded-[12px] border border-line bg-white px-3 text-sm font-bold outline-none focus:border-primary" />{reviewNote.length > 0 && reviewNoteRemaining > 0 ? <p className="text-[11px] font-semibold text-danger">要求修改还需填写 {reviewNoteRemaining} 个字，避免画师无法判断修改范围。</p> : null}<div className="flex flex-wrap gap-2"><Button type="button" disabled={saving} className="flex-1 sm:flex-none" onClick={() => onReview(waitingDelivery.id, "approved", reviewNote || "审核通过")}><CheckCircle2 size={15} />{saving ? "正在处理" : order.status === "draft_review" ? "确认草稿" : "验收成稿"}</Button><Button type="button" variant="secondary" disabled={saving || reviewNoteRemaining > 0} className="flex-1 sm:flex-none" onClick={() => onReview(waitingDelivery.id, "revision_requested", reviewNote)}><XCircle size={15} />要求修改</Button></div></div> : null}

      {(mode === "client" || mode === "all") && order.status === "pending_balance" ? <Button type="button" disabled={saving} className="mt-4 w-full sm:w-auto" onClick={() => { if (window.confirm(`确认模拟支付尾款 ¥${order.balance_amount}？支付后订单将完成。`)) void onPayBalance(order.id); }}><CreditCard size={16} />{saving ? "正在支付" : `支付模拟尾款 ¥${order.balance_amount}`}</Button> : null}
      {order.status === "completed" ? <><p className="mt-4 inline-flex items-center gap-2 text-sm font-black text-primary"><CheckCircle2 size={16} />订单已完成，交付与付款记录已保存</p>{(mode === "client" || mode === "all") ? <ArtistReviewForm orderId={order.id} /> : null}</> : null}

      {dispute ? <div className="mt-4 rounded-[16px] border border-danger/25 bg-danger/5 p-4"><p className="text-xs font-black uppercase text-danger">争议处理中</p><p className="mt-2 text-sm font-semibold leading-6 text-muted">{dispute.reason}</p>{mode === "admin" && isAdmin ? <div className="mt-3 grid gap-2"><input aria-label={`仲裁说明-${order.id}`} value={resolutionNote} onChange={(event) => setResolutionNote(event.target.value)} placeholder="填写管理员仲裁依据" className="h-11 rounded-[12px] border border-line bg-white px-3 text-sm font-bold outline-none focus:border-primary" /><p className={cn("text-[11px] font-semibold", resolutionNoteRemaining > 0 ? "text-danger" : "text-muted")}>{resolutionNoteRemaining > 0 ? `还需填写 ${resolutionNoteRemaining} 个字才能作出仲裁。` : "仲裁依据已完整，请选择处理结果。"}</p><div className="flex flex-wrap gap-2"><Button type="button" disabled={saving || resolutionNoteRemaining > 0} onClick={() => onResolveDispute(dispute.id, "continue", resolutionNote)}>继续履约</Button><Button type="button" variant="danger" disabled={saving || resolutionNoteRemaining > 0} onClick={() => onResolveDispute(dispute.id, "refund", resolutionNote)}>模拟退款</Button><Button type="button" variant="secondary" disabled={saving || resolutionNoteRemaining > 0} onClick={() => onResolveDispute(dispute.id, "close", resolutionNote)}>关闭订单</Button></div></div> : <p className="mt-3 text-xs font-black text-danger">管理员处理中，期间无法继续交付或付款。</p>}</div> : null}

      {order.status === "cancelled" ? <p className="mt-4 inline-flex items-center gap-2 text-sm font-black text-danger"><XCircle size={16} />订单已关闭 · 定金 {order.deposit_status === "refunded" ? "已退款" : order.deposit_status} · 尾款 {order.balance_status === "refunded" ? "已退款" : order.balance_status}</p> : null}
      <details className="mt-4 rounded-[16px] border border-line bg-white p-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-black text-muted"><span>查看进度、付款与沟通</span><span className="rounded-pill bg-bg px-3 py-1">{unreadCount > 0 ? `${unreadCount} 条未读` : "展开详情"}</span></summary>
        <div className="mt-4 grid gap-2 sm:grid-cols-3"><span className="rounded-[12px] bg-bg px-3 py-2 text-xs font-bold text-muted">总价 <strong className="text-ink">¥{order.quoted_amount}</strong></span><span className="rounded-[12px] bg-bg px-3 py-2 text-xs font-bold text-muted">定金 <strong className="text-ink">¥{order.deposit_amount} · {order.deposit_status === "paid" ? "已支付" : order.deposit_status === "refunded" ? "已退款" : "未支付"}</strong></span><span className="rounded-[12px] bg-bg px-3 py-2 text-xs font-bold text-muted">尾款 <strong className="text-ink">¥{order.balance_amount} · {order.balance_status === "paid" ? "已支付" : order.balance_status === "refunded" ? "已退款" : "未支付"}</strong></span></div>
        <OrderStatusTimeline status={order.status} />
        <OrderMessagePanel orderId={order.id} userId={userId} unreadCount={unreadCount} onRead={onMessagesRead} />
        {(mode === "client" || mode === "artist" || mode === "all") && !dispute && order.status !== "cancelled" && order.status !== "disputed" ? <details className="mt-3 rounded-[14px] border border-line bg-bg p-3"><summary className="cursor-pointer text-xs font-black text-muted">遇到履约问题？发起争议</summary><p className="mt-2 text-xs font-semibold leading-5 text-muted">争议会立即冻结交付与付款，仅在双方无法通过消息解决问题时使用。</p><textarea aria-label={`争议原因-${order.id}`} value={disputeReason} onChange={(event) => setDisputeReason(event.target.value)} rows={3} placeholder="说明交付、授权、时间或付款方面的问题" className="mt-3 w-full rounded-[12px] border border-line bg-white p-3 text-sm font-semibold outline-none focus:border-danger" /><p className="mt-1 text-[11px] font-semibold text-muted">{disputeReasonRemaining > 0 ? `还需填写 ${disputeReasonRemaining} 个字才能提交。` : "原因已填写，提交后订单会冻结。"}</p><Button type="button" variant="danger" disabled={saving || disputeReasonRemaining > 0} className="mt-2 w-full sm:w-auto" onClick={() => onOpenDispute(order.id, disputeReason)}><XCircle size={15} />提交争议并冻结订单</Button></details> : null}
      </details>
    </article>
  );
}
