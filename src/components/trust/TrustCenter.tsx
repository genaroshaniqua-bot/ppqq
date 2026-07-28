"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AlertTriangle, Copyright, ExternalLink, FileCheck2, LoaderCircle, LockKeyhole, Scale, ShieldCheck } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type PrivacyRequest = {
  id: string;
  request_type: string;
  status: string;
  resolution: string | null;
  created_at: string;
};

type TrustCase = {
  id: string;
  case_type: string;
  target_type: string;
  target_id: string;
  status: string;
  resolution: string | null;
  created_at: string;
};

const legalCards = [
  { href: "/legal/terms", title: "用户服务协议", text: "账户、平台服务、用户行为与终止规则", icon: FileCheck2 },
  { href: "/legal/privacy", title: "隐私政策", text: "信息处理范围、保存期限与您的权利", icon: LockKeyhole },
  { href: "/legal/creator-agreement", title: "画师服务规则", text: "服务、交付、授权与创作者责任", icon: Scale },
  { href: "/legal/content-rules", title: "内容与社区规范", text: "禁止内容、审核处置与申诉机制", icon: ShieldCheck },
  { href: "/legal/copyright", title: "版权保护规则", text: "侵权通知、反通知与内容恢复", icon: Copyright }
];

const privacyLabels: Record<string, string> = {
  access: "查阅个人信息", export: "复制或导出", correction: "更正信息", deletion: "删除信息",
  account_closure: "注销账户", consent_withdrawal: "撤回同意", privacy_complaint: "隐私投诉"
};

const caseLabels: Record<string, string> = {
  content_report: "内容举报", copyright_notice: "版权投诉", copyright_counter_notice: "版权反通知", appeal: "处理申诉"
};

const statusLabels: Record<string, string> = {
  submitted: "已提交", triaged: "已分流", in_review: "处理中", awaiting_user: "待补充",
  actioned: "已处置", completed: "已完成", rejected: "未支持", withdrawn: "已撤回", cancelled: "已取消"
};

export function TrustCenter() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [privacyRequests, setPrivacyRequests] = useState<PrivacyRequest[]>([]);
  const [cases, setCases] = useState<TrustCase[]>([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [caseType, setCaseType] = useState("content_report");

  async function loadMine() {
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    if (user) {
      const [privacyResult, casesResult] = await Promise.all([
        supabase.from("privacy_requests").select("id, request_type, status, resolution, created_at").order("created_at", { ascending: false }),
        supabase.from("trust_cases").select("id, case_type, target_type, target_id, status, resolution, created_at").order("created_at", { ascending: false })
      ]);
      setPrivacyRequests((privacyResult.data ?? []) as PrivacyRequest[]);
      setCases((casesResult.data ?? []) as TrustCase[]);
    }
    setLoading(false);
  }

  useEffect(() => { void loadMine(); }, []);

  async function submitPrivacy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;
    setSubmitting(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const { error } = await createSupabaseBrowserClient().from("privacy_requests").insert({
      user_id: userId,
      request_type: String(form.get("request_type")),
      details: String(form.get("details")).trim()
    });
    setSubmitting(false);
    if (error) return setMessage(error.message);
    event.currentTarget.reset();
    setMessage("隐私权利请求已提交，通常会在 15 日内反馈。");
    await loadMine();
  }

  async function submitCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;
    setSubmitting(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const evidence = String(form.get("evidence_urls") ?? "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean).slice(0, 8);
    const caseType = String(form.get("case_type"));
    const parentCaseId = String(form.get("parent_case_id") ?? "").trim() || null;
    if ((caseType === "appeal" || caseType === "copyright_counter_notice") && !parentCaseId) {
      setSubmitting(false);
      return setMessage("申诉或反通知必须填写原案件编号。");
    }
    const { error } = await createSupabaseBrowserClient().from("trust_cases").insert({
      reporter_id: userId,
      case_type: caseType,
      target_type: String(form.get("target_type")),
      target_id: String(form.get("target_id")).trim(),
      reason_code: String(form.get("reason_code")),
      description: String(form.get("description")).trim(),
      claimant_name: String(form.get("claimant_name") ?? "").trim() || null,
      claimant_contact: String(form.get("claimant_contact") ?? "").trim() || null,
      attestation: form.get("attestation") === "on",
      evidence_urls: evidence,
      parent_case_id: parentCaseId
    });
    setSubmitting(false);
    if (error) return setMessage(error.message);
    event.currentTarget.reset();
    setMessage("案件已提交，可在下方跟踪处理状态。");
    await loadMine();
  }

  return (
    <div className="bg-bg py-8 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-card bg-ink p-7 text-white shadow-soft sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-lime">Trust & safety</p>
          <h1 className="mt-3 font-display text-4xl font-black sm:text-5xl">信任与安全中心</h1>
          <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-white/70">
            在一个入口查看平台规则、行使隐私权利、举报不当内容、提交版权投诉，并对处理结果提出申诉。
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-pill bg-white/10 px-4 py-2 text-xs font-bold text-white/65">
            <AlertTriangle size={15} className="text-lime" />真实支付已暂停；当前不收集银行卡或支付账户信息
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {legalCards.map(({ href, title, text, icon: Icon }) => (
            <Link key={href} href={href} className="group rounded-card border border-line bg-white p-5 shadow-soft transition hover:-translate-y-1 hover:border-primary">
              <Icon size={22} className="text-primary" />
              <h2 className="mt-4 text-base font-black">{title}</h2>
              <p className="mt-2 text-xs font-semibold leading-5 text-muted">{text}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-black text-primary">查看全文<ExternalLink size={13} /></span>
            </Link>
          ))}
        </section>

        {loading ? <div className="grid min-h-48 place-items-center"><LoaderCircle className="animate-spin text-primary" /></div> : !userId ? (
          <section className="mt-6 rounded-card border border-line bg-white p-7 text-center shadow-soft">
            <h2 className="font-display text-2xl font-black">登录后提交和跟踪请求</h2>
            <p className="mt-2 text-sm font-semibold text-muted">协议无需登录即可阅读；隐私、举报、版权和申诉需要账户身份以便安全跟进。</p>
            <Link href="/login?next=%2Ftrust" className="mt-5 inline-flex min-h-12 items-center rounded-pill bg-lime px-6 text-sm font-black">登录平台</Link>
          </section>
        ) : (
          <>
            {message ? <p role="status" className="mt-6 rounded-card border border-primary/20 bg-primary/5 p-4 text-sm font-bold text-primary">{message}</p> : null}
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <form onSubmit={submitPrivacy} className="rounded-card border border-line bg-white p-6 shadow-soft">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Privacy rights</p>
                <h2 className="mt-2 font-display text-2xl font-black">行使隐私权利</h2>
                <p className="mt-2 text-xs font-semibold leading-5 text-muted">高风险请求可能需要再次核验身份。请勿在说明中填写身份证号或密码。</p>
                <label className="mt-5 block text-sm font-black">请求类型
                  <select name="request_type" required className="mt-2 h-12 w-full rounded-[16px] border border-line bg-bg px-4 outline-none focus:border-primary">
                    {Object.entries(privacyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="mt-4 block text-sm font-black">具体说明
                  <textarea name="details" required minLength={10} maxLength={4000} rows={5} placeholder="请说明希望查阅、更正、删除或投诉的具体内容（至少 10 字）" className="mt-2 w-full rounded-[16px] border border-line bg-bg p-4 text-sm outline-none focus:border-primary" />
                </label>
                <button disabled={submitting} className="mt-4 min-h-12 w-full rounded-pill bg-ink px-5 text-sm font-black text-white disabled:opacity-50">提交隐私请求</button>
              </form>

              <form onSubmit={submitCase} className="rounded-card border border-line bg-white p-6 shadow-soft">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Report & appeal</p>
                <h2 className="mt-2 font-display text-2xl font-black">举报、版权与申诉</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-black">案件类型
                    <select name="case_type" required value={caseType} onChange={(event) => setCaseType(event.target.value)} className="mt-2 h-12 w-full rounded-[16px] border border-line bg-bg px-4">
                      {Object.entries(caseLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-black">目标类型
                    <select name="target_type" required className="mt-2 h-12 w-full rounded-[16px] border border-line bg-bg px-4">
                      <option value="portfolio">作品</option><option value="product">商品</option><option value="commission_request">需求</option>
                      <option value="profile">用户主页</option><option value="message">消息</option><option value="other">其他</option>
                    </select>
                  </label>
                </div>
                <label className="mt-4 block text-sm font-black">目标编号或链接
                  <input name="target_id" required placeholder="粘贴页面链接或填写目标 ID" className="mt-2 h-12 w-full rounded-[16px] border border-line bg-bg px-4 text-sm" />
                </label>
                <label className="mt-4 block text-sm font-black">原案件编号（仅申诉/反通知必填）
                  <input name="parent_case_id" placeholder="UUID 格式的案件编号" className="mt-2 h-12 w-full rounded-[16px] border border-line bg-bg px-4 text-sm" />
                </label>
                <label className="mt-4 block text-sm font-black">理由
                  <select name="reason_code" required className="mt-2 h-12 w-full rounded-[16px] border border-line bg-bg px-4">
                    <option value="infringement">侵权或盗用</option><option value="fraud">欺诈或虚假信息</option>
                    <option value="harassment">骚扰或仇恨</option><option value="illegal">违法或不当内容</option>
                    <option value="privacy">隐私泄露</option><option value="decision_error">处理结果有误</option><option value="other">其他</option>
                  </select>
                </label>
                <label className="mt-4 block text-sm font-black">事实与理由
                  <textarea name="description" required minLength={10} maxLength={5000} rows={4} placeholder="请提供可核验的事实、权利基础或申诉理由" className="mt-2 w-full rounded-[16px] border border-line bg-bg p-4 text-sm" />
                </label>
                {caseType === "copyright_notice" || caseType === "copyright_counter_notice" ? (
                  <fieldset className="mt-4 rounded-[16px] border border-primary/20 bg-primary/5 p-4">
                    <legend className="px-2 text-sm font-black text-primary">版权法定信息</legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-black">权利人 / 提交者姓名或名称
                        <input name="claimant_name" required minLength={2} className="mt-2 h-11 w-full rounded-[14px] border border-line bg-white px-3 text-sm" />
                      </label>
                      <label className="text-xs font-black">可联系邮箱、电话或地址
                        <input name="claimant_contact" required minLength={5} className="mt-2 h-11 w-full rounded-[14px] border border-line bg-white px-3 text-sm" />
                      </label>
                    </div>
                    <label className="mt-3 flex items-start gap-2 text-xs font-semibold leading-5 text-muted">
                      <input name="attestation" type="checkbox" required className="mt-1 size-4 accent-primary" />
                      我确认所填信息和证据真实、准确，并知悉故意提交虚假通知或反通知可能承担相应责任。
                    </label>
                  </fieldset>
                ) : null}
                <label className="mt-4 block text-sm font-black">证据链接（每行一个，最多 8 个）
                  <textarea name="evidence_urls" rows={2} placeholder="https://…" className="mt-2 w-full rounded-[16px] border border-line bg-bg p-4 text-sm" />
                </label>
                <button disabled={submitting} className="mt-4 min-h-12 w-full rounded-pill bg-lime px-5 text-sm font-black disabled:opacity-50">提交案件</button>
              </form>
            </div>

            <section className="mt-6 rounded-card border border-line bg-white p-6 shadow-soft">
              <h2 className="font-display text-2xl font-black">我的处理进度</h2>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {[...privacyRequests.map((item) => ({ ...item, title: privacyLabels[item.request_type], meta: "隐私请求" })),
                  ...cases.map((item) => ({ ...item, title: caseLabels[item.case_type], meta: `${item.target_type} · ${item.target_id}` }))]
                  .sort((a, b) => b.created_at.localeCompare(a.created_at))
                  .map((item) => (
                    <article key={item.id} className="rounded-[18px] border border-line bg-bg p-4">
                      <div className="flex items-start justify-between gap-3"><div><h3 className="font-black">{item.title}</h3><p className="mt-1 break-all text-xs font-semibold text-muted">{item.meta}</p></div><span className="shrink-0 rounded-pill bg-white px-3 py-1 text-xs font-black text-primary">{statusLabels[item.status] ?? item.status}</span></div>
                      <p className="mt-3 break-all font-mono text-[10px] text-muted">案件编号：{item.id}</p>
                      {item.resolution ? <p className="mt-3 text-xs font-semibold leading-5 text-muted">处理说明：{item.resolution}</p> : null}
                    </article>
                  ))}
                {privacyRequests.length + cases.length === 0 ? <p className="text-sm font-semibold text-muted">暂无请求或案件。</p> : null}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
