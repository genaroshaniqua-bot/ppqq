"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, ClipboardList, Coins, FileText, Images, Save, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FeatureArtPanel } from "@/components/layout/FeatureArtPanel";
import { Toast } from "@/components/ui/Toast";
import { COMMISSION_DRAFT_STORAGE_KEY, type CommissionDraft } from "@/lib/commission-draft";

const requestCategories = ["OC 头像", "角色立绘", "Live2D", "表情 / 徽章", "摊宣 / 周边", "文案 / 剧情"];
const licenseOptions = ["个人使用", "商业使用", "版权买断"];
const requestRequirements = ["需要过程确认", "可接受 AI 辅助说明", "需要源文件", "可分阶段付款"];
const budgetOptions = ["¥100 - ¥300", "¥200 - ¥500", "¥500 - ¥1,000", "¥1,000 以上"];

export default function CreatePage() {
  const router = useRouter();
  const [toast, setToast] = useState("");
  const [requestTitle, setRequestTitle] = useState("");
  const [requestCategory, setRequestCategory] = useState(requestCategories[0]);
  const [requestBrief, setRequestBrief] = useState("");
  const [requestBudget, setRequestBudget] = useState("¥200 - ¥500");
  const [requestDeadline, setRequestDeadline] = useState("两周内");
  const [requestLicense, setRequestLicense] = useState(licenseOptions[0]);
  const [requirements, setRequirements] = useState<string[]>(["需要过程确认"]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedService = params.get("service");
    const requestedLicense = params.get("license");
    const raw = window.localStorage.getItem(COMMISSION_DRAFT_STORAGE_KEY);
    let restoredDraft = false;

    if (raw) {
      try {
        const draft = JSON.parse(raw) as CommissionDraft;
        setRequestTitle(draft.title);
        setRequestCategory(draft.category);
        setRequestBrief(draft.brief);
        setRequestBudget(`¥${draft.budgetMin} - ¥${draft.budgetMax}`);
        setRequestDeadline(draft.deadlineLabel);
        setRequestLicense(draft.usageScope === "personal" ? "个人使用" : "商业使用");
        setRequirements(draft.requirements);
        restoredDraft = true;
      } catch {
        window.localStorage.removeItem(COMMISSION_DRAFT_STORAGE_KEY);
      }
    }

    if (requestedService && requestCategories.includes(requestedService)) {
      setRequestCategory(requestedService);
      if (requestedLicense && licenseOptions.includes(requestedLicense)) setRequestLicense(requestedLicense);
      setToast(`已从首页选择「${requestedService}」服务`);
    } else if (restoredDraft) {
      setToast("已从角色创作工坊带入约稿需求");
    }
  }, []);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']") || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "1") document.getElementById("request-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (event.key === "2") document.getElementById("request-preview")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  function toggleRequirement(requirement: string) {
    setRequirements((current) => (current.includes(requirement) ? current.filter((item) => item !== requirement) : [...current, requirement]));
  }

  function getDraft(): CommissionDraft | null {
    if (!requestTitle.trim() || !requestBrief.trim()) {
      setToast("请补全需求标题和需求说明");
      return null;
    }
    const budget = requestBudget.match(/\d[\d,]*/g)?.map((value) => Number(value.replaceAll(",", ""))) ?? [200, 500];
    return {
      title: requestTitle.trim(),
      category: requestCategory,
      brief: requestBrief.trim(),
      budgetMin: budget[0] ?? 200,
      budgetMax: budget[1] ?? budget[0] ?? 500,
      deadlineLabel: requestDeadline,
      usageScope: requestLicense === "个人使用" ? "personal" : "commercial",
      requirements
    };
  }

  function saveDraft() {
    const draft = getDraft();
    if (!draft) return;
    window.localStorage.setItem(COMMISSION_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    setToast("需求草稿已保存在当前设备");
  }

  function matchService() {
    const draft = getDraft();
    if (!draft) return;
    window.localStorage.setItem(COMMISSION_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    router.push("/profile/commissions?draft=1");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-white/75 bg-white/76 p-4 shadow-soft backdrop-blur-xl">
        <div className="flex flex-wrap gap-2">
          {[
            ["1", "准备需求", "request-form"],
            ["2", "需求预览", "request-preview"]
          ].map(([key, label, target]) => (
            <button key={target} type="button" onClick={() => document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" })} className="inline-flex min-h-10 items-center gap-2 rounded-pill border border-line bg-white px-4 text-sm font-black text-ink transition hover:border-primary hover:bg-primary/10">
              <kbd className="grid size-5 place-items-center rounded bg-bg text-[11px] font-black text-muted">{key}</kbd>
              {label}
            </button>
          ))}
        </div>
        <Link href="/studio" className="inline-flex min-h-10 items-center gap-2 rounded-pill bg-primary/14 px-4 text-sm font-black text-ink transition hover:bg-primary/24">
          <Sparkles size={16} className="text-primary" aria-hidden="true" />
          用 OC 助手补全设定
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>

      <section className="mb-7 grid gap-6 rounded-[36px] border border-line bg-white p-6 shadow-soft md:p-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
        <div>
          <p className="text-xs font-black uppercase text-primary">Request workspace</p>
          <h1 className="mt-2 font-display text-4xl font-black md:text-5xl">准备约稿需求</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">先整理服务类型、预算、交付节点和授权范围，再选择真实画师服务提交委托。</p>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-muted"><ClipboardList size={16} className="text-primary" aria-hidden="true" />提交前会进入真实服务选择页</span>
        </div>
        <FeatureArtPanel src="/images/artwork/green-wedding.jpg" alt="绿色长发角色礼服插画委托样例" eyebrow="需求单目标" caption="先用成品方向说明风格、用途、档期和授权边界" className="min-h-[220px]" />
      </section>

      <section id="request-form" className="scroll-mt-28 grid gap-6 lg:grid-cols-[0.62fr_0.38fr]">
        <form className="rounded-card border border-line bg-white p-5 shadow-soft sm:p-6" onSubmit={(event) => { event.preventDefault(); matchService(); }}>
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-xs font-black uppercase text-primary">Brief</p><h2 className="mt-1 font-display text-2xl font-black">填写需求单</h2></div>
            <ClipboardList size={24} className="text-primary" aria-hidden="true" />
          </div>

          <div className="mt-6 grid gap-5">
            <div>
              <label htmlFor="request-title" className="text-sm font-black">需求标题 <span className="text-danger">*</span></label>
              <input id="request-title" value={requestTitle} onChange={(event) => setRequestTitle(event.target.value)} className="mt-2 min-h-12 w-full rounded-pill border border-line bg-bg px-4 text-sm font-bold outline-none transition focus:border-primary" placeholder="例如：为 OC 制作半身头像与两张表情差分" />
            </div>

            <fieldset>
              <legend className="text-sm font-black">需要的服务</legend>
              <div className="mt-2 flex flex-wrap gap-2">{requestCategories.map((category) => <button key={category} type="button" aria-pressed={requestCategory === category} onClick={() => setRequestCategory(category)} className={`min-h-10 rounded-pill px-4 text-sm font-black transition ${requestCategory === category ? "bg-ink text-white" : "bg-bg text-muted hover:bg-primary/15 hover:text-ink"}`}>{category}</button>)}</div>
            </fieldset>

            <div>
              <label htmlFor="request-brief" className="text-sm font-black">需求说明 <span className="text-danger">*</span></label>
              <textarea id="request-brief" value={requestBrief} onChange={(event) => setRequestBrief(event.target.value)} rows={5} className="mt-2 w-full rounded-[20px] border border-line bg-bg px-4 py-3 text-sm leading-6 outline-none transition focus:border-primary" placeholder="描述角色、画面用途、必须保留的元素、想避免的内容，以及是否已有参考图。" />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="text-sm font-black">预算范围<select value={requestBudget} onChange={(event) => setRequestBudget(event.target.value)} className="mt-2 min-h-12 w-full rounded-pill border border-line bg-bg px-4 text-sm font-bold outline-none focus:border-primary">{!budgetOptions.includes(requestBudget) ? <option value={requestBudget}>{requestBudget}（来自创作工坊）</option> : null}{budgetOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
              <label className="text-sm font-black">期望交付<select value={requestDeadline} onChange={(event) => setRequestDeadline(event.target.value)} className="mt-2 min-h-12 w-full rounded-pill border border-line bg-bg px-4 text-sm font-bold outline-none focus:border-primary"><option>一周内</option><option>两周内</option><option>一个月内</option><option>可协商</option></select></label>
              <label className="text-sm font-black">授权范围<select value={requestLicense} onChange={(event) => setRequestLicense(event.target.value)} className="mt-2 min-h-12 w-full rounded-pill border border-line bg-bg px-4 text-sm font-bold outline-none focus:border-primary">{licenseOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
            </div>

            <fieldset>
              <legend className="text-sm font-black">合作偏好</legend>
              <div className="mt-2 flex flex-wrap gap-2">{requestRequirements.map((requirement) => { const selected = requirements.includes(requirement); return <button key={requirement} type="button" onClick={() => toggleRequirement(requirement)} className={`min-h-10 rounded-pill border px-4 text-sm font-bold transition ${selected ? "border-primary bg-primary/15 text-ink" : "border-line bg-white text-muted hover:border-primary/50"}`}>{selected ? <CheckCircle2 size={15} className="mr-1 inline" aria-hidden="true" /> : null}{requirement}</button>; })}</div>
            </fieldset>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 border-t border-line pt-5"><Button type="button" variant="secondary" onClick={saveDraft}><Save size={16} aria-hidden="true" />保存草稿</Button><Button type="submit"><Send size={16} aria-hidden="true" />匹配真实服务</Button></div>
        </form>

        <aside id="request-preview" className="scroll-mt-28 h-fit rounded-card border border-line bg-white p-5 shadow-soft lg:sticky lg:top-24">
          <p className="text-xs font-black uppercase text-primary">Live preview</p><h2 className="mt-1 font-display text-2xl font-black">需求预览</h2>
          <div className="mt-5 rounded-[20px] bg-bg p-5">
            <div className="flex items-start justify-between gap-3"><span className="rounded-pill bg-primary/16 px-3 py-1 text-xs font-black text-ink">{requestCategory}</span><Coins size={18} className="text-primary" aria-hidden="true" /></div>
            <h3 className="mt-4 text-lg font-black">{requestTitle || "为你的需求起一个标题"}</h3>
            <p className="mt-3 min-h-20 text-sm leading-6 text-muted">{requestBrief || "需求说明会展示在这里。写清用途、角色信息和期望风格，画师更容易判断是否适合接单。"}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm font-bold"><span><Coins size={15} className="mr-1 inline text-primary" />{requestBudget}</span><span><CalendarDays size={15} className="mr-1 inline text-primary" />{requestDeadline}</span><span className="col-span-2"><FileText size={15} className="mr-1 inline text-primary" />{requestLicense}</span></div>
            <div className="mt-4 flex flex-wrap gap-2">{requirements.map((item) => <span key={item} className="rounded-pill bg-white px-3 py-1 text-xs font-bold text-muted">{item}</span>)}</div>
          </div>
          <Link href="/characters" className="mt-4 flex min-h-16 w-full items-center justify-center gap-3 rounded-[18px] border border-dashed border-line bg-white text-sm font-black text-muted transition hover:border-primary hover:text-ink"><Images size={18} aria-hidden="true" />查看已保存角色卡</Link>
          <p className="mt-4 rounded-[16px] bg-primary/12 p-3 text-sm font-bold text-ink">草稿不会直接创建订单；选择真实服务并提交后，画师才能报价。</p>
        </aside>
      </section>
      <Toast message={toast} />
    </div>
  );
}
