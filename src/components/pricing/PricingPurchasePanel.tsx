"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Coins, Sparkles } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Plan = { name: string; price: string; desc: string; features: string[] };
export function PricingPurchasePanel({ plans }: { plans: Plan[] }) {
  const [balance, setBalance] = useState<number | null>(null);
  useEffect(() => {
    const client = createSupabaseBrowserClient();
    void client.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await client.from("profiles").select("point_balance").eq("id", data.user.id).single();
      if (profile) setBalance(profile.point_balance);
    });
  }, []);
  return <>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-line bg-white px-5 py-4 shadow-soft">
      <p className="text-sm font-bold text-muted">收款与充值暂未开放。以下方案仅供了解，不会扣款或增加账户点数。</p>
      <div className="flex items-center gap-3 rounded-pill bg-ink px-4 py-3 text-white"><Coins size={18} /><span>当前余额</span><strong>{balance === null ? "暂不可用" : `${balance} 点`}</strong></div>
    </div>
    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {plans.map((plan, index) => <article key={plan.name} className={`rounded-card border border-line bg-white p-5 shadow-soft ${index === 2 ? "ring-4 ring-primary/30" : ""}`}>
        <div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="font-display text-2xl font-black">{plan.name}</h2><p className="mt-1 text-sm font-semibold text-muted">{plan.desc}</p></div><Sparkles size={20} /></div>
        <p className="font-display text-4xl font-black">{plan.price}</p>
        <ul className="mt-6 space-y-3">{plan.features.map(feature => <li key={feature} className="flex gap-3 text-sm font-semibold leading-6 text-muted"><Check className="mt-0.5 shrink-0 text-primary" size={17} /><span>{feature}</span></li>)}</ul>
        {index === 0 ? <Link href="/studio" className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-pill bg-bg px-5 text-sm font-black">免费开始</Link> : <button disabled className="mt-6 min-h-11 w-full rounded-pill bg-bg px-5 text-sm font-black text-muted">暂未开放购买</button>}
      </article>)}
    </section>
  </>;
}
