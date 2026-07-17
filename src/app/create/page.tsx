"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, ClipboardList, Coins, FileText, Globe2, Images, LoaderCircle, Save, Sparkles, UserSearch } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FeatureArtPanel } from "@/components/layout/FeatureArtPanel";
import { Toast } from "@/components/ui/Toast";
import { COMMISSION_DRAFT_STORAGE_KEY, type CommissionDraft } from "@/lib/commission-draft";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { TaskPathGuide } from "@/components/onboarding/TaskPathGuide";

const requestCategories = ["OC 头像", "角色立绘", "Live2D", "表情 / 徽章", "摊宣 / 周边", "文案 / 剧情"];
const licenseOptions = ["个人使用", "商业使用", "版权买断"];
const requestRequirements = ["需要过程确认", "可接受 AI 辅助说明", "需要源文件", "可分阶段付款"];
const budgetOptions = ["¥100 - ¥300", "¥200 - ¥500", "¥500 - ¥1,000", "¥1,000 - ¥2,999", "¥3,000 - ¥5,000", "¥5,000 - ¥10,000"];

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
  const [collectionDays, setCollectionDays] = useState(7);
  const [publishing, setPublishing] = useState(false);

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

  async function publishPublicRequest() {
    const draft = getDraft();
    if (!draft) return;
    setPublishing(true);
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + (requestDeadline === "一周内" ? 7 : requestDeadline === "两周内" ? 14 : requestDeadline === "一个月内" ? 30 : 30));
    const usageScope = requestLicense === "个人使用" ? "personal" : requestLicense === "版权买断" ? "buyout" : "commercial";
    const { data, error } = await createSupabaseBrowserClient().rpc("publish_public_commission", {
      request_title: draft.title,
      request_brief: `${draft.brief}\n\n合作偏好：${requirements.join("、") || "无"}`,
      request_service_type: requestCategory,
      request_budget_min: draft.budgetMin,
      request_budget_max: draft.budgetMax,
      request_deadline: deadline.toISOString().slice(0, 10),
      request_usage_scope: usageScope,
      request_collection_days: collectionDays,
      request_allow_public_display: false,
      request_allow_ai_training: requirements.includes("可接受 AI 辅助说明")
    });
    setPublishing(false);
    if (error) {
      setToast(error.message.includes("publish_public_commission") ? "公开需求服务尚未初始化，请稍后重试" : error.message);
      return;
    }
    window.localStorage.removeItem(COMMISSION_DRAFT_STORAGE_KEY);
    setToast(draft.budgetMax >= 3000 || usageScope !== "personal" ? "需求已提交，等待管理员审核" : "需求已通过自动检查并公开发布");
    window.setTimeout(() => router.push(`/profile/commissions?public=${data}`), 900);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <TaskPathGuide
        eyebrow="发布前先选择路径"
        title="一份需求，可以公开征集，也可以交给指定画师"
        description="先把需求写完整，再决定发布方式。公开征集会展示响应人数和报价区间；指定约稿会带着草稿进入服务列表。两种方式都不会立即扣款。"
        paths={[
          { eyebrow: "适合还没选好画师", title: "公开征集方案", description: "需求通过检查后进入大厅。画师必须关联自己的服务或套餐才能响应，你最终只能选择一人。", steps: ["填写需求", "公开发布", "选择画师"], href: "#request-form", action: "开始填写需求", icon: Globe2, emphasis: "dark" },
          { eyebrow: "适合已有喜欢的画师", title: "匹配指定服务", description: "先保存需求草稿，再从服务列表挑选画师与套餐，提交后等待对方确认范围和报价。", steps: ["保存草稿", "选择服务", "确认报价"], href: "/commissions", action: "先看画师服务", icon: UserSearch }
        ]}
      />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-white/75 bg-white/76 p-4 shadow-soft backdrop-blur-xl">
        <div className="flex flex-wrap gap-2">
          {[
            ["1", "填写需求", "request-form"],
            ["2", "检查预览", "request-preview"]
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
          <h2 className="mt-2 font-display text-4xl font-black md:text-5xl">把画师真正需要的信息一次写清</h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">填写服务类型、预算、档期、授权与合作偏好。完成后再选择“公开征集”或“匹配指定服务”，不会因为填写表单而自动发布。</p>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-muted"><ClipboardList size={16} className="text-primary" aria-hidden="true" />高金额、商用授权或被举报的需求会进入人工审核</span>
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

            <label className="text-sm font-black">公开征集时间<select value={collectionDays} onChange={(event) => setCollectionDays(Number(event.target.value))} className="mt-2 min-h-12 w-full rounded-pill border border-line bg-bg px-4 text-sm font-bold outline-none focus:border-primary"><option value={3}>3 天</option><option value={7}>7 天（推荐）</option><option value={14}>14 天</option></select><span className="mt-2 block text-xs font-semibold text-muted">画师提交的报价默认保留 72 小时。</span></label>

            <fieldset>
              <legend className="text-sm font-black">合作偏好</legend>
              <div className="mt-2 flex flex-wrap gap-2">{requestRequirements.map((requirement) => { const selected = requirements.includes(requirement); return <button key={requirement} type="button" onClick={() => toggleRequirement(requirement)} className={`min-h-10 rounded-pill border px-4 text-sm font-bold transition ${selected ? "border-primary bg-primary/15 text-ink" : "border-line bg-white text-muted hover:border-primary/50"}`}>{selected ? <CheckCircle2 size={15} className="mr-1 inline" aria-hidden="true" /> : null}{requirement}</button>; })}</div>
            </fieldset>
          </div>

          <div className="mt-6 border-t border-line pt-5">
            <p className="mb-3 text-sm font-black text-ink">填写完成后，选择下一步</p>
            <div className="flex flex-wrap gap-3"><Button type="button" variant="secondary" onClick={saveDraft}><Save size={16} aria-hidden="true" />仅保存草稿</Button><Button type="submit"><UserSearch size={16} aria-hidden="true" />带着草稿找指定画师</Button><Button type="button" disabled={publishing} onClick={publishPublicRequest} className="bg-lime text-ink hover:bg-primary"><Globe2 size={16} aria-hidden="true" />{publishing ? <><LoaderCircle size={15} className="animate-spin" />正在发布</> : "确认并公开征集"}</Button></div>
            <p className="mt-3 text-xs font-semibold leading-5 text-muted">公开征集：多位画师可以响应，最终只能选一人。指定约稿：只把需求发给你选择的服务提供者。</p>
          </div>
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
          <p className="mt-4 rounded-[16px] bg-primary/12 p-3 text-sm font-bold text-ink">可匹配指定画师服务，也可公开征集多个方案；最终选定一名画师后才生成正式订单。</p>
        </aside>
      </section>
      <Toast message={toast} />
    </div>
  );
}
