"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Coins, CreditCard, LoaderCircle, ReceiptText, Sparkles, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Plan = { name: string; price: string; desc: string; features: string[] };
type Package = { code: "basic_monthly" | "premium_monthly" | "project_pack"; points: number; amount: number };

const packages: Record<number, Package | null> = {
  0: null,
  1: { code: "basic_monthly", points: 800, amount: 29 },
  2: { code: "premium_monthly", points: 2400, amount: 69 },
  3: { code: "project_pack", points: 300, amount: 12 }
};

export function PricingPurchasePanel({ plans }: { plans: Plan[] }) {
  const [balance, setBalance] = useState<number | null>(null);
  const [selected, setSelected] = useState<{ plan: Plan; pack: Package } | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase.from("profiles").select("point_balance").eq("id", data.user.id).single();
      if (profile && typeof profile.point_balance === "number") setBalance(profile.point_balance);
    });
  }, []);

  async function purchase() {
    if (!selected) return;
    setLoading(true);
    setMessage("");
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login?next=/pricing";
      return;
    }
    const { data, error } = await supabase.rpc("simulate_point_purchase", { target_package: selected.pack.code });
    setLoading(false);
    if (error) {
      setMessage(error.message.includes("simulate_point_purchase") ? "点数服务尚未初始化，请稍后重试。" : error.message);
      return;
    }
    const result = Array.isArray(data) ? data[0] : data;
    setBalance(result?.new_balance ?? balance);
    setMessage(`充值成功，${selected.pack.points} 点已到账。`);
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-line bg-white px-5 py-4 shadow-soft">
        <div><p className="text-xs font-black uppercase text-primary">Credit wallet</p><p className="mt-1 text-sm font-bold text-muted">模拟付款成功后，点数会真实保存到你的账户。</p></div>
        <div className="flex items-center gap-3 rounded-pill bg-ink px-4 py-3 text-white"><Coins size={18} className="text-lime" /><span className="text-sm font-bold text-white/60">当前余额</span><strong className="font-display text-xl">{balance === null ? "登录后查看" : `${balance} 点`}</strong></div>
      </div>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan, index) => {
          const pack = packages[index];
          return <article key={plan.name} className={`rounded-card border border-line bg-white p-5 shadow-soft ${index === 2 ? "ring-4 ring-primary/30" : ""}`}>
            <div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="font-display text-2xl font-black">{plan.name}</h2><p className="mt-1 text-sm font-semibold text-muted">{plan.desc}</p></div><span className={`grid size-11 place-items-center rounded-pill ${index === 2 ? "bg-lime" : "bg-bg"}`}>{index === 2 ? <Sparkles size={19} /> : <Coins size={19} />}</span></div>
            <p className="font-display text-4xl font-black">{plan.price}</p>
            <ul className="mt-6 space-y-3">{plan.features.map((feature) => <li key={feature} className="flex gap-3 text-sm font-semibold leading-6 text-muted"><Check className="mt-0.5 shrink-0 text-primary" size={17} /><span>{feature}</span></li>)}</ul>
            {pack ? <button type="button" onClick={() => { setSelected({ plan, pack }); setMessage(""); }} className={`mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-pill px-5 text-sm font-black transition ${index === 2 ? "bg-ink text-white hover:bg-primary hover:text-ink" : "bg-bg text-ink hover:bg-primary/15"}`}><CreditCard size={16} />模拟购买</button> : <Link href="/studio" className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-pill bg-bg px-5 text-sm font-black text-ink hover:bg-primary/15">免费开始</Link>}
          </article>;
        })}
      </section>

      {selected ? <div className="fixed inset-0 z-[80] grid place-items-center bg-ink/55 px-4 backdrop-blur-sm" onMouseDown={() => !loading && setSelected(null)}>
        <section role="dialog" aria-modal="true" aria-labelledby="point-purchase-title" onMouseDown={(event) => event.stopPropagation()} className="relative w-full max-w-md rounded-[30px] bg-white p-6 shadow-[0_28px_90px_rgba(18,16,22,0.3)]">
          <button type="button" disabled={loading} onClick={() => setSelected(null)} className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-bg" aria-label="关闭购买窗口"><X size={18} /></button>
          <span className="grid size-12 place-items-center rounded-full bg-lime"><Coins size={21} /></span>
          <p className="mt-5 text-xs font-black uppercase text-primary">Simulated checkout</p><h2 id="point-purchase-title" className="mt-1 font-display text-3xl font-black">购买{selected.plan.name}</h2>
          <div className="mt-5 rounded-[20px] bg-bg p-4"><div className="flex justify-between text-sm font-bold text-muted"><span>到账点数</span><strong className="text-ink">{selected.pack.points} 点</strong></div><div className="mt-3 flex justify-between text-sm font-bold text-muted"><span>模拟支付金额</span><strong className="text-ink">¥{selected.pack.amount}</strong></div></div>
          <p className="mt-4 text-xs font-semibold leading-5 text-muted">这是平台模拟支付，不会调用银行卡或第三方支付；确认后将生成充值流水并更新 Supabase 点数余额。</p>
          {message ? <p role="status" className={`mt-4 rounded-[16px] px-4 py-3 text-sm font-bold ${message.startsWith("充值成功") ? "bg-primary/10 text-primary" : "bg-danger/10 text-danger"}`}>{message}</p> : null}
          <button type="button" disabled={loading || message.startsWith("充值成功")} onClick={purchase} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-pill bg-ink text-sm font-black text-white disabled:opacity-55">{loading ? <LoaderCircle size={17} className="animate-spin" /> : <ReceiptText size={17} />}{loading ? "正在处理" : message.startsWith("充值成功") ? "点数已到账" : "确认模拟支付"}</button>
        </section>
      </div> : null}
    </>
  );
}
