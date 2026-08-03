"use client";

import { FormEvent, useEffect, useState } from "react";
import { Building2, ClipboardCheck, LoaderCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Operator = { entity_name: string | null; unified_social_credit_code: string | null; registered_address: string | null; customer_service_phone: string | null; customer_service_email: string | null; privacy_contact_email: string | null; business_license_url: string | null; icp_filing_number: string | null; public_notice: string | null };
type Review = { id: string; review_scope: string; result: string; findings: string; remediation_due_at: string | null; reviewed_at: string };

export function AdminCompliancePanel() {
  const [operator, setOperator] = useState<Operator | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    const supabase = createSupabaseBrowserClient();
    const [{ data: operatorData }, { data: reviewData }] = await Promise.all([
      supabase.from("platform_operator_profile").select("entity_name, unified_social_credit_code, registered_address, customer_service_phone, customer_service_email, privacy_contact_email, business_license_url, icp_filing_number, public_notice").eq("id", true).single(),
      supabase.from("compliance_review_records").select("id, review_scope, result, findings, remediation_due_at, reviewed_at").order("reviewed_at", { ascending: false }).limit(20)
    ]);
    setOperator(operatorData as Operator);
    setReviews((reviewData ?? []) as Review[]);
  }

  useEffect(() => { load().catch((e) => setMessage(e instanceof Error ? e.message : "加载失败")).finally(() => setLoading(false)); }, []);

  async function saveOperator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    const values = Object.fromEntries(["entity_name", "unified_social_credit_code", "registered_address", "customer_service_phone", "customer_service_email", "privacy_contact_email", "business_license_url", "icp_filing_number", "public_notice"].map((key) => [key, String(form.get(key) ?? "").trim() || null]));
    const { error } = await supabase.from("platform_operator_profile").update({ ...values, updated_by: user?.id, updated_at: new Date().toISOString() }).eq("id", true);
    setMessage(error ? error.message : "经营主体信息已更新。完成法务复核前请勿开启真实支付。");
    if (!error) await load();
  }

  async function recordReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const { error } = await createSupabaseBrowserClient().rpc("record_compliance_review", {
      target_scope: String(form.get("scope")), target_entity_id: "platform",
      review_result: String(form.get("result")), review_findings: String(form.get("findings")).trim(),
      remediation_due: String(form.get("due") || "") || null
    });
    setMessage(error ? error.message : "合规复核记录已保存并写入审计日志。");
    if (!error) { event.currentTarget.reset(); await load(); }
  }

  if (loading) return <div className="flex justify-center p-12"><LoaderCircle className="animate-spin text-primary" /></div>;
  return <section className="space-y-6">
    <header className="rounded-card border border-line bg-white p-6 shadow-soft"><p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Compliance</p><h1 className="mt-2 font-display text-3xl font-black">主体信息与合规复核</h1><p className="mt-2 text-sm font-semibold text-muted">主体资料必须来自营业执照和真实联系方式；系统不允许用示例内容冒充已完成公示。</p></header>
    {message ? <p role="status" className="rounded-pill bg-ink px-5 py-3 text-center text-sm font-black text-white">{message}</p> : null}
    <form onSubmit={saveOperator} className="rounded-card border border-line bg-white p-6 shadow-soft"><h2 className="inline-flex items-center gap-2 font-display text-2xl font-black"><Building2 className="text-primary" />经营主体公示</h2><div className="mt-5 grid gap-4 md:grid-cols-2">{[["entity_name","经营主体全称"],["unified_social_credit_code","统一社会信用代码"],["registered_address","注册地址"],["customer_service_phone","客服电话"],["customer_service_email","客服邮箱"],["privacy_contact_email","个人信息保护邮箱"],["business_license_url","营业执照公示地址"],["icp_filing_number","ICP备案号"]].map(([name,label]) => <label key={name} className="text-sm font-black">{label}<input name={name} defaultValue={operator?.[name as keyof Operator] ?? ""} className="mt-2 h-12 w-full rounded-[16px] border border-line bg-bg px-4 font-bold outline-none focus:border-primary" /></label>)}</div><label className="mt-4 block text-sm font-black">公示说明<textarea name="public_notice" defaultValue={operator?.public_notice ?? ""} rows={3} className="mt-2 w-full rounded-[16px] border border-line bg-bg p-4 font-semibold" /></label><Button type="submit" className="mt-5"><Save size={16} />保存主体信息</Button></form>
    <form onSubmit={recordReview} className="rounded-card border border-line bg-white p-6 shadow-soft"><h2 className="inline-flex items-center gap-2 font-display text-2xl font-black"><ClipboardCheck className="text-purple" />新增合规复核记录</h2><div className="mt-5 grid gap-4 md:grid-cols-3"><select name="scope" className="h-12 rounded-[16px] border border-line bg-bg px-4 font-bold"><option value="platform">平台整体</option><option value="legal_documents">正式协议</option><option value="privacy">隐私与实名</option><option value="content">内容治理</option><option value="copyright">版权</option><option value="operations">运维与灾备</option></select><select name="result" className="h-12 rounded-[16px] border border-line bg-bg px-4 font-bold"><option value="pass">通过</option><option value="conditional_pass">有条件通过</option><option value="remediation_required">需要整改</option><option value="blocked">阻断上线</option></select><input name="due" type="datetime-local" className="h-12 rounded-[16px] border border-line bg-bg px-4 font-bold" /></div><textarea name="findings" required minLength={5} rows={4} placeholder="记录法律依据、核查证据、遗留风险和整改责任人" className="mt-4 w-full rounded-[16px] border border-line bg-bg p-4 font-semibold" /><Button type="submit" className="mt-4"><ClipboardCheck size={16} />保存复核记录</Button></form>
    <div className="grid gap-3">{reviews.map((review) => <article key={review.id} className="rounded-[20px] border border-line bg-white p-5 shadow-soft"><div className="flex justify-between gap-3"><p className="font-black">{review.review_scope}</p><span className="rounded-pill bg-bg px-3 py-1 text-xs font-black">{review.result}</span></div><p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-muted">{review.findings}</p><p className="mt-3 text-xs font-bold text-muted">复核时间：{new Date(review.reviewed_at).toLocaleString("zh-CN")}{review.remediation_due_at ? ` · 整改期限：${new Date(review.remediation_due_at).toLocaleString("zh-CN")}` : ""}</p></article>)}</div>
  </section>;
}
