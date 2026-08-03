"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Check, LoaderCircle, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Application = {
  user_id: string;
  headline: string | null;
  introduction: string | null;
  review_status: "draft" | "pending" | "approved" | "rejected";
  availability: string;
  display_name?: string;
  identity?: {
    operator_type: string;
    legal_name: string;
    document_type: string;
    document_last4: string;
    contact_phone: string;
    operating_address: string;
    business_name: string | null;
    unified_social_credit_code: string | null;
    verification_status: "draft" | "pending" | "needs_info" | "verified" | "rejected" | "expired";
    verification_method: string | null;
    verification_provider: string | null;
    verification_reference: string | null;
    next_reverification_at: string | null;
    rejection_reason: string | null;
  } | null;
};

export function ArtistReviewPanel() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadApplications() {
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("请先登录");
    const { data: admin } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (admin?.role !== "admin") throw new Error("当前账号没有管理员权限");

    const { data: artists, error: artistError } = await supabase
      .from("artist_profiles")
      .select("user_id, headline, introduction, review_status, availability")
      .order("created_at", { ascending: false });
    if (artistError) throw artistError;

    const ids = (artists ?? []).map((item) => item.user_id);
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("id, display_name").in("id", ids)
      : { data: [] as { id: string; display_name: string }[] };
    const names = new Map((profiles ?? []).map((item) => [item.id, item.display_name]));
    const { data: identities, error: identityError } = ids.length
      ? await supabase.from("artist_identity_verifications").select("user_id, operator_type, legal_name, document_type, document_last4, contact_phone, operating_address, business_name, unified_social_credit_code, verification_status, verification_method, verification_provider, verification_reference, next_reverification_at, rejection_reason").in("user_id", ids)
      : { data: [], error: null };
    if (identityError) throw identityError;
    const identityMap = new Map((identities ?? []).map((item) => [item.user_id, item]));
    setApplications((artists ?? []).map((item) => ({ ...item, display_name: names.get(item.user_id) ?? "未命名用户", identity: identityMap.get(item.user_id) ?? null })) as Application[]);
  }

  useEffect(() => {
    loadApplications().catch((reason) => setError(reason instanceof Error ? reason.message : "审核列表加载失败")).finally(() => setLoading(false));
  }, []);

  async function review(userId: string, status: "approved" | "rejected") {
    const supabase = createSupabaseBrowserClient();
    const { error: reviewError } = await supabase.rpc("review_artist_application", {
      target_user_id: userId,
      decision: status
    });
    if (reviewError) {
      setError(reviewError.message);
      return;
    }
    setApplications((current) => current.map((item) => item.user_id === userId ? { ...item, review_status: status } : item));
  }

  async function reviewIdentity(userId: string, decision: "verified" | "needs_info" | "rejected") {
    const note = window.prompt(decision === "verified" ? "请输入核验结论（至少 5 个字符）" : "请输入需补充或拒绝的具体理由（至少 5 个字符）");
    if (!note || note.trim().length < 5) return;
    const method = decision === "verified" ? window.prompt("核验方式：manual_offline 或 contracted_provider", "manual_offline") : "manual_offline";
    const provider = decision === "verified" ? window.prompt("核验机构或执行人名称", "平台人工核验") : "";
    const reference = decision === "verified" ? window.prompt("请输入可追溯的核验凭证编号") : "";
    if (decision === "verified" && (!method || !reference || reference.trim().length < 4)) {
      setError("通过实名核验必须填写核验方式和凭证编号。");
      return;
    }
    const { error: reviewError } = await createSupabaseBrowserClient().rpc("review_artist_identity_verification", {
      target_user_id: userId,
      decision,
      review_note: note.trim(),
      method,
      provider_name: provider ?? "",
      provider_reference: reference ?? ""
    });
    if (reviewError) {
      setError(reviewError.message);
      return;
    }
    setError("");
    await loadApplications();
  }

  return (
    <div className="mx-auto min-h-[calc(100dvh-5rem)] max-w-6xl px-4 py-8 sm:px-6">
      <Link href="/profile" className="inline-flex items-center gap-2 text-sm font-black text-muted hover:text-ink"><ArrowLeft size={17} />返回个人中心</Link>
      <div className="mt-5 flex items-center gap-4">
        <span className="grid size-14 place-items-center rounded-pill bg-lime text-ink"><ShieldCheck /></span>
        <div><p className="text-xs font-black uppercase text-primary">Admin Console</p><h1 className="font-display text-4xl font-black">画师入驻审核</h1></div>
      </div>
      {loading ? <div className="mt-10 flex justify-center"><LoaderCircle className="animate-spin text-primary" /></div> : null}
      {error ? <p role="alert" className="mt-6 rounded-card border border-danger/30 bg-danger/5 p-4 text-sm font-bold text-danger">{error}</p> : null}
      {!loading && !error && applications.length === 0 ? <p className="mt-8 rounded-card border border-line bg-white p-8 text-center text-sm font-bold text-muted shadow-soft">暂时没有画师入驻申请。</p> : null}
      <div className="mt-8 grid gap-4">
        {applications.map((item) => (
          <article key={item.user_id} className="rounded-card border border-line bg-white p-5 shadow-soft sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="text-sm font-black text-purple">{item.display_name}</p><h2 className="mt-1 font-display text-2xl font-black">{item.headline}</h2></div>
              <span className="rounded-pill bg-bg px-3 py-2 text-xs font-black text-muted">{item.review_status}</span>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm font-semibold leading-7 text-muted">{item.introduction}</p>
            <div className="mt-5 rounded-[20px] border border-line bg-bg p-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><p className="inline-flex items-center gap-2 text-sm font-black"><BadgeCheck size={17} className="text-primary" />实名准入</p><span className="rounded-pill bg-white px-3 py-1 text-xs font-black text-muted">{item.identity?.verification_status ?? "未提交"}</span></div>
              {item.identity ? <div className="mt-3 grid gap-2 text-xs font-semibold leading-5 text-muted sm:grid-cols-2"><p>姓名 / 名称：<strong className="text-ink">{item.identity.legal_name}</strong></p><p>证件：{item.identity.document_type} · 末四位 {item.identity.document_last4}</p><p>类型：{item.identity.operator_type}</p><p>联系电话：{item.identity.contact_phone}</p><p className="sm:col-span-2">经营地址：{item.identity.operating_address}</p>{item.identity.business_name ? <p>营业执照名称：{item.identity.business_name}</p> : null}{item.identity.unified_social_credit_code ? <p>统一社会信用代码：{item.identity.unified_social_credit_code}</p> : null}{item.identity.rejection_reason ? <p className="sm:col-span-2 text-danger">上次反馈：{item.identity.rejection_reason}</p> : null}</div> : <p className="mt-3 text-xs font-semibold text-danger">该申请尚未提交实名资料，不能批准为画师。</p>}
              {item.identity && item.identity.verification_status !== "verified" ? <div className="mt-4 flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => reviewIdentity(item.user_id, "verified")}>实名通过</Button><Button type="button" variant="secondary" onClick={() => reviewIdentity(item.user_id, "needs_info")}>要求补充</Button><Button type="button" variant="danger" onClick={() => reviewIdentity(item.user_id, "rejected")}>实名拒绝</Button></div> : null}
            </div>
            <div className="mt-5 flex gap-3">
              <Button type="button" onClick={() => review(item.user_id, "approved")} disabled={item.review_status === "approved" || item.identity?.verification_status !== "verified"}><Check size={16} />通过画师准入</Button>
              <Button type="button" variant="danger" onClick={() => review(item.user_id, "rejected")} disabled={item.review_status === "rejected"}><X size={16} />拒绝</Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
