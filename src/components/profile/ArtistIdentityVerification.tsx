"use client";

import { FormEvent, useEffect, useState } from "react";
import { BadgeCheck, FileCheck2, LoaderCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Verification = {
  operator_type: "individual" | "sole_proprietor" | "company";
  legal_name: string;
  document_type: "cn_id" | "passport" | "business_license";
  document_last4: string;
  contact_phone: string;
  operating_address: string;
  business_name: string | null;
  unified_social_credit_code: string | null;
  verification_status: "draft" | "pending" | "needs_info" | "verified" | "rejected" | "expired";
  rejection_reason: string | null;
  verified_at: string | null;
  next_reverification_at: string | null;
};

const statusLabels: Record<Verification["verification_status"], string> = {
  draft: "尚未提交",
  pending: "等待实名核验",
  needs_info: "需要补充资料",
  verified: "实名核验已通过",
  rejected: "实名核验未通过",
  expired: "核验已过期"
};

export function ArtistIdentityVerification() {
  const [verification, setVerification] = useState<Verification | null>(null);
  const [operatorType, setOperatorType] = useState<Verification["operator_type"]>("individual");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: row } = await supabase
        .from("artist_identity_verifications")
        .select("operator_type, legal_name, document_type, document_last4, contact_phone, operating_address, business_name, unified_social_credit_code, verification_status, rejection_reason, verified_at, next_reverification_at")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (row) {
        setVerification(row as Verification);
        setOperatorType(row.operator_type as Verification["operator_type"]);
      }
    }).finally(() => setLoading(false));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const { data, error } = await createSupabaseBrowserClient().rpc("submit_artist_identity_verification", {
      application_operator_type: operatorType,
      application_legal_name: String(form.get("legalName") ?? "").trim(),
      application_document_type: String(form.get("documentType") ?? "cn_id"),
      application_document_last4: String(form.get("documentLast4") ?? "").trim(),
      application_contact_phone: String(form.get("contactPhone") ?? "").trim(),
      application_operating_address: String(form.get("operatingAddress") ?? "").trim(),
      application_business_name: operatorType === "individual" ? null : String(form.get("businessName") ?? "").trim(),
      application_uscc: operatorType === "individual" ? null : String(form.get("uscc") ?? "").trim(),
      application_attestation: form.get("attestation") === "on"
    }).single();
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setVerification(data as Verification);
    setMessage("实名准入资料已提交。平台仅保存证件末四位和核验结果，不保存完整证件号码。");
  }

  if (loading) return <section className="rounded-card border border-line bg-white p-6 shadow-soft"><LoaderCircle className="animate-spin text-primary" /></section>;

  const locked = verification?.verification_status === "verified" && verification.next_reverification_at && new Date(verification.next_reverification_at) > new Date();

  return (
    <form onSubmit={submit} className="rounded-card border border-line bg-white p-5 shadow-soft sm:p-6 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-primary">Verified artist admission</p>
          <h2 className="mt-2 font-display text-2xl font-black">画师实名准入</h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-muted">实名核验通过后才能进入画师审核。完整证件号码不在本站保存；审核员仅登记核验渠道、凭证编号和复核日期。</p>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-pill px-3 py-2 text-xs font-black ${locked ? "bg-lime text-ink" : "bg-primary/12 text-primary"}`}>
          {locked ? <BadgeCheck size={16} /> : <ShieldAlert size={16} />}
          {verification ? statusLabels[verification.verification_status] : "尚未提交"}
        </span>
      </div>

      {verification?.rejection_reason ? <p className="mt-4 rounded-[16px] border border-danger/20 bg-danger/5 p-4 text-sm font-bold text-danger">审核反馈：{verification.rejection_reason}</p> : null}
      {locked ? <div className="mt-5 rounded-[20px] bg-lime/20 p-5 text-sm font-semibold leading-7"><p className="font-black">实名核验有效</p><p>证件末四位：{verification.document_last4} · 下次复核：{new Date(verification.next_reverification_at!).toLocaleDateString("zh-CN")}</p></div> : (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-black">经营者类型<select name="operatorType" value={operatorType} onChange={(e) => setOperatorType(e.target.value as Verification["operator_type"])} className="mt-2 h-12 w-full rounded-[16px] border border-line bg-bg px-4 font-bold"><option value="individual">自然人画师</option><option value="sole_proprietor">个体工商户</option><option value="company">企业</option></select></label>
            <label className="text-sm font-black">真实姓名 / 法定名称<input name="legalName" required minLength={2} defaultValue={verification?.legal_name ?? ""} autoComplete="name" className="mt-2 h-12 w-full rounded-[16px] border border-line bg-bg px-4 font-bold outline-none focus:border-primary" /></label>
            <label className="text-sm font-black">核验证件<select name="documentType" defaultValue={verification?.document_type ?? "cn_id"} className="mt-2 h-12 w-full rounded-[16px] border border-line bg-bg px-4 font-bold"><option value="cn_id">中华人民共和国居民身份证</option><option value="passport">护照</option><option value="business_license">营业执照</option></select></label>
            <label className="text-sm font-black">证件号码末四位<input name="documentLast4" required pattern="[0-9A-Za-z]{4}" maxLength={4} defaultValue={verification?.document_last4 ?? ""} className="mt-2 h-12 w-full rounded-[16px] border border-line bg-bg px-4 font-bold uppercase outline-none focus:border-primary" /></label>
            <label className="text-sm font-black">联系电话<input name="contactPhone" required minLength={7} defaultValue={verification?.contact_phone ?? ""} autoComplete="tel" className="mt-2 h-12 w-full rounded-[16px] border border-line bg-bg px-4 font-bold outline-none focus:border-primary" /></label>
            <label className="text-sm font-black">经常居所 / 经营地址<input name="operatingAddress" required minLength={6} defaultValue={verification?.operating_address ?? ""} autoComplete="street-address" className="mt-2 h-12 w-full rounded-[16px] border border-line bg-bg px-4 font-bold outline-none focus:border-primary" /></label>
            {operatorType !== "individual" ? <><label className="text-sm font-black">营业执照名称<input name="businessName" required minLength={2} defaultValue={verification?.business_name ?? ""} className="mt-2 h-12 w-full rounded-[16px] border border-line bg-bg px-4 font-bold outline-none focus:border-primary" /></label><label className="text-sm font-black">统一社会信用代码<input name="uscc" required minLength={18} maxLength={18} defaultValue={verification?.unified_social_credit_code ?? ""} className="mt-2 h-12 w-full rounded-[16px] border border-line bg-bg px-4 font-bold uppercase outline-none focus:border-primary" /></label></> : null}
          </div>
          <label className="mt-5 flex gap-3 rounded-[18px] bg-bg p-4 text-sm font-semibold leading-6"><input name="attestation" type="checkbox" required className="mt-1 size-4 accent-primary" /><span>我确认信息真实、准确、完整，并同意平台为画师准入、交易安全、争议处理和依法报送之目的进行核验与定期复核。</span></label>
          <Button type="submit" disabled={saving} className="mt-5"><FileCheck2 size={16} />{saving ? "正在提交" : verification ? "更新并重新提交实名资料" : "提交实名核验"}</Button>
        </>
      )}
      {message ? <p role="status" className="mt-4 rounded-pill bg-ink px-4 py-3 text-center text-sm font-black text-white">{message}</p> : null}
    </form>
  );
}
