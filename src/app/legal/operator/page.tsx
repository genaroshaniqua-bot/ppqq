import Link from "next/link";
import { Building2, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OperatorDisclosurePage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("platform_operator_profile").select("entity_name, unified_social_credit_code, registered_address, customer_service_phone, customer_service_email, privacy_contact_email, business_license_url, icp_filing_number, public_notice, updated_at").eq("id", true).maybeSingle();
  const complete = Boolean(data?.entity_name && data?.unified_social_credit_code && data?.registered_address && data?.customer_service_email);

  return <main className="mx-auto min-h-[calc(100dvh-9rem)] max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
    <Link href="/trust" className="text-sm font-black text-muted hover:text-ink">← 返回信任与安全中心</Link>
    <section className="mt-5 overflow-hidden rounded-[34px] bg-ink p-6 text-white shadow-soft sm:p-8">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-lime">Operator disclosure</p>
      <h1 className="mt-3 font-display text-4xl font-black sm:text-5xl">经营主体信息</h1>
      <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/64">依照电子商务经营者信息公示要求持续展示。信息发生变更后由管理员复核并及时更新。</p>
    </section>
    {!complete ? <p className="mt-6 rounded-[20px] border border-danger/20 bg-danger/5 p-5 text-sm font-bold leading-6 text-danger">经营主体资料尚未完整录入。真实支付、收费会员和平台抽佣功能应继续保持关闭。此提示不会被前端隐藏。</p> : null}
    <section className="mt-6 grid gap-4 rounded-card border border-line bg-white p-5 shadow-soft sm:p-7">
      <Info icon={Building2} label="经营主体全称" value={data?.entity_name} />
      <Info icon={ShieldCheck} label="统一社会信用代码" value={data?.unified_social_credit_code} />
      <Info icon={MapPin} label="注册地址" value={data?.registered_address} />
      <Info icon={Phone} label="客户服务电话" value={data?.customer_service_phone} />
      <Info icon={Mail} label="客户服务邮箱" value={data?.customer_service_email} />
      <Info icon={Mail} label="个人信息保护联系邮箱" value={data?.privacy_contact_email} />
      <Info icon={ShieldCheck} label="ICP备案号" value={data?.icp_filing_number} />
      {data?.business_license_url ? <a href={data.business_license_url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 w-fit items-center rounded-pill bg-ink px-5 text-sm font-black text-white">查看营业执照公示材料</a> : null}
      {data?.public_notice ? <p className="rounded-[18px] bg-bg p-4 text-sm font-semibold leading-6 text-muted">{data.public_notice}</p> : null}
      <p className="text-xs font-semibold text-muted">最后更新：{data?.updated_at ? new Date(data.updated_at).toLocaleString("zh-CN") : "尚未更新"}</p>
    </section>
  </main>;
}

function Info({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value?: string | null }) {
  return <div className="grid gap-2 border-b border-line pb-4 sm:grid-cols-[190px_1fr]"><p className="inline-flex items-center gap-2 text-sm font-black text-muted"><Icon size={16} />{label}</p><p className="break-all text-sm font-bold text-ink">{value || "待经营主体补充"}</p></div>;
}
