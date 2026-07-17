"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, Check, CheckCircle2, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type ServicePackage = {
  id: string;
  tier: "basic" | "standard" | "premium";
  title: string;
  description: string;
  price: number;
  delivery_days: number;
  revision_limit: number;
  features: string[];
};

type ServiceSummary = {
  id: string;
  title: string;
  base_price: number;
  delivery_days: number;
  revision_limit: number;
};

const tierLabels = { basic: "基础", standard: "标准", premium: "高级" };

export function ServiceRequestPanel({ service, packages }: { service: ServiceSummary; packages: ServicePackage[] }) {
  const fallbackPackage = useMemo<ServicePackage>(() => ({
    id: "",
    tier: "basic",
    title: "基础方案",
    description: "按服务基础范围进行报价",
    price: Number(service.base_price),
    delivery_days: service.delivery_days,
    revision_limit: service.revision_limit,
    features: ["基础交付", `含 ${service.revision_limit} 次修改`]
  }), [service]);
  const options = packages.length > 0 ? packages : [fallbackPackage];
  const [selectedId, setSelectedId] = useState(options[0].id);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const selected = options.find((item) => item.id === selectedId) ?? options[0];
  const titleRemaining = Math.max(0, 4 - title.trim().length);
  const briefRemaining = Math.max(0, 20 - brief.trim().length);
  const canSubmit = titleRemaining === 0 && briefRemaining === 0;
  const today = new Date().toISOString().slice(0, 10);

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("登录后才能发起委托。");
      setMessageTone("error");
      return;
    }

    setSaving(true);
    setMessage("");
    const packageSnapshot = {
      id: selected.id || null,
      tier: selected.tier,
      title: selected.title,
      price: selected.price,
      delivery_days: selected.delivery_days,
      revision_limit: selected.revision_limit,
      features: selected.features
    };
    const { error } = await supabase.from("commission_requests").insert({
      client_id: user.id,
      service_id: service.id,
      package_id: selected.id || null,
      package_snapshot: packageSnapshot,
      title: String(form.get("title") ?? "").trim(),
      brief: String(form.get("brief") ?? "").trim(),
      budget_min: selected.price,
      budget_max: Number(form.get("budgetMax")),
      deadline: String(form.get("deadline") ?? "") || null,
      usage_scope: String(form.get("usageScope") ?? "personal"),
      allow_public_display: form.get("allowPublic") === "on",
      allow_ai_training: false
    });
    setSaving(false);
    if (error) {
      setMessage(error.message);
      setMessageTone("error");
      return;
    }
    formElement.reset();
    setTitle("");
    setBrief("");
    setMessageTone("success");
    setMessage("委托已发送。下一步等待画师确认范围并给出最终报价。");
  }

  return (
    <section className="rounded-[30px] border border-line bg-white p-5 shadow-soft sm:p-6" aria-labelledby="service-package-heading">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Choose a package</p>
        <h2 id="service-package-heading" className="mt-1 font-display text-3xl font-black">选择委托套餐</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-muted">套餐确定基础范围，画师仍会根据完整需求发送最终报价。</p>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {options.map((item) => {
          const active = selected.id === item.id;
          return (
            <button
              key={item.id || item.tier}
              type="button"
              aria-pressed={active}
              onClick={() => setSelectedId(item.id)}
              className={cn(
                "rounded-[22px] border p-4 text-left transition",
                active ? "border-lime bg-ink text-white shadow-soft" : "border-line bg-bg text-ink hover:border-primary"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className={cn("rounded-pill px-3 py-1 text-xs font-black", active ? "bg-lime text-ink" : "bg-white text-primary")}>{tierLabels[item.tier]}</span>
                <span className="font-display text-2xl font-black">¥{item.price}</span>
              </div>
              <h3 className="mt-4 font-display text-xl font-black">{item.title}</h3>
              <p className={cn("mt-2 text-xs font-semibold leading-5", active ? "text-white/60" : "text-muted")}>{item.description}</p>
              <div className="mt-4 space-y-2 text-xs font-bold">
                <p>{item.delivery_days} 天交付 · {item.revision_limit} 次修改</p>
                {item.features.map((feature) => <p key={feature} className="flex items-center gap-2"><Check size={13} className={active ? "text-lime" : "text-primary"} aria-hidden="true" />{feature}</p>)}
              </div>
            </button>
          );
        })}
      </div>

      <form onSubmit={submitRequest} className="mt-6 rounded-[22px] bg-bg p-4 sm:p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-black">需求标题<input name="title" required minLength={4} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：月光系 OC 半身立绘" className="mt-2 h-11 w-full rounded-[14px] border border-line bg-white px-3 outline-none focus:border-primary" /><span className="mt-1 block text-[11px] font-semibold text-muted">{titleRemaining > 0 ? `还需填写 ${titleRemaining} 个字。` : "标题已完整。"}</span></label>
          <label className="text-sm font-black">期望交付日期<input name="deadline" type="date" min={today} className="mt-2 h-11 w-full rounded-[14px] border border-line bg-white px-3 outline-none focus:border-primary" /><span className="mt-1 block text-[11px] font-semibold text-muted">留空表示可与画师协商；选择日期后订单会提示剩余时间。</span></label>
          <label className="text-sm font-black">预算上限<input name="budgetMax" type="number" min={selected.price} required value={Math.max(selected.price, selected.price * 1.5)} readOnly className="mt-2 h-11 w-full rounded-[14px] border border-line bg-white px-3 outline-none" /></label>
          <label className="text-sm font-black">使用范围<select name="usageScope" className="mt-2 h-11 w-full rounded-[14px] border border-line bg-white px-3 outline-none focus:border-primary"><option value="personal">个人使用</option><option value="commercial">商业使用</option></select></label>
          <label className="text-sm font-black md:col-span-2">详细需求<textarea name="brief" required minLength={20} value={brief} onChange={(event) => setBrief(event.target.value)} rows={5} placeholder="描述角色设定、构图、服装、表情、尺寸、授权和交付格式" className="mt-2 w-full rounded-[14px] border border-line bg-white p-3 outline-none focus:border-primary" /><span className="mt-1 block text-[11px] font-semibold text-muted">{briefRemaining > 0 ? `还需填写 ${briefRemaining} 个字，请至少说明角色、画面和交付要求。` : "需求信息已达到可提交标准。"}</span></label>
          <label className="flex items-center gap-2 rounded-[14px] bg-white px-4 py-3 text-sm font-black md:col-span-2"><input name="allowPublic" type="checkbox" />允许画师在作品集中公开展示成稿</label>
        </div>
        {message ? <div role={messageTone === "error" ? "alert" : "status"} className={cn("mt-4 flex items-start gap-3 rounded-[14px] border px-4 py-3 text-sm font-bold", messageTone === "error" ? "border-danger/20 bg-danger/5 text-danger" : "border-primary/20 bg-white text-ink")}>{messageTone === "error" ? <XCircle size={18} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary" />}<div><p>{message}</p>{messageTone === "success" ? <Link href="/profile/commissions" className="mt-2 inline-flex items-center gap-1 text-xs font-black text-primary">查看我的委托<ArrowRight size={14} /></Link> : null}</div></div> : null}
        <Button type="submit" disabled={saving || !canSubmit} className="mt-4 w-full sm:w-auto"><Send size={16} aria-hidden="true" />{saving ? "正在发送" : "发送委托需求"}</Button>
        {!canSubmit ? <p className="mt-2 text-xs font-semibold text-muted">填写完整标题和详细需求后即可发送。</p> : null}
      </form>
    </section>
  );
}
