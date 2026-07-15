"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Bell, Crown, FolderHeart, Heart, Palette, ReceiptText, Settings2, Sparkles } from "lucide-react";
import { NotificationBadge } from "@/components/notifications/NotificationBadge";
import { ProfileBackendStats } from "@/components/profile/ProfileBackendStats";
import { CreditBalance } from "@/components/profile/CreditBalance";
import { readCharacters } from "@/lib/storage";
import type { Character } from "@/types/character";

const workspaces = [
  { href: "/studio", label: "继续创作", desc: "从最近的角色灵感继续生成。", icon: Sparkles, tone: "bg-lime" },
  { href: "/characters", label: "角色资产", desc: "整理已保存的人设与创作记录。", icon: FolderHeart, tone: "bg-primary/15" },
  { href: "/profile/commissions", label: "我的委托", desc: "确认报价、审核交付和处理争议。", icon: ReceiptText, tone: "bg-purple/15" },
  { href: "/profile/orders", label: "商品订单", desc: "查看付款、交付、物流和退款。", icon: Heart, tone: "bg-pink/15" }
];

export default function ProfilePage() {
  const [characters, setCharacters] = useState<Character[]>([]);

  useEffect(() => setCharacters(readCharacters()), []);

  return (
    <div className="profile-page mx-auto min-h-[calc(100dvh-9rem)] max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[34px] bg-ink text-white shadow-soft">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_300px] md:p-8">
          <div className="flex flex-col justify-center">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-lime">My workspace</p>
            <h1 className="mt-3 font-display text-4xl font-black md:text-6xl">欢迎回到你的创作据点</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/64 md:text-base">
              这里保留最重要的进度与入口；资料、入驻和外观设置已归入独立页面。
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/studio" className="inline-flex min-h-11 items-center gap-2 rounded-pill bg-lime px-5 text-sm font-black text-ink">
                <Sparkles size={17} aria-hidden="true" />继续创作
              </Link>
              <Link href="/profile/settings" className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-white/16 bg-white/8 px-5 text-sm font-black text-white hover:bg-white/14">
                <Settings2 size={17} aria-hidden="true" />管理账户
              </Link>
            </div>
          </div>

          <aside className="rounded-[26px] border border-white/10 bg-white/[0.07] p-5">
            <div className="flex items-center justify-between">
              <span className="grid size-12 place-items-center rounded-full bg-gradient-to-br from-purple to-pink text-lg font-black">艾</span>
              <span className="inline-flex items-center gap-2 rounded-pill bg-white/10 px-3 py-2 text-xs font-black"><Crown size={15} />基础会员</span>
            </div>
            <div className="mt-7 grid grid-cols-2 gap-3">
              <div><p className="text-xs font-bold text-white/50">点数余额</p><p className="mt-1 font-display text-3xl font-black"><CreditBalance /></p></div>
              <div><p className="text-xs font-bold text-white/50">未读通知</p><p className="mt-1 font-display text-3xl font-black"><NotificationBadge compact /></p></div>
            </div>
            <Link href="/pricing" className="mt-6 flex min-h-11 items-center justify-between rounded-pill bg-white px-4 text-sm font-black text-ink">查看会员权益<ArrowRight size={16} /></Link>
          </aside>
        </div>
      </section>

      <section className="mt-6" aria-labelledby="asset-overview-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div><p className="text-xs font-black uppercase text-primary">Live overview</p><h2 id="asset-overview-heading" className="mt-1 font-display text-2xl font-black">资产与待办</h2></div>
          <Link href="/profile/notifications" className="inline-flex min-h-10 items-center gap-2 rounded-pill bg-white px-4 text-xs font-black text-muted shadow-soft"><Bell size={15} />查看通知</Link>
        </div>
        <ProfileBackendStats characterCount={characters.length} />
      </section>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="常用工作区">
        {workspaces.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="group rounded-card border border-line bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-primary">
              <span className={`grid size-11 place-items-center rounded-full text-ink ${item.tone}`}><Icon size={20} /></span>
              <div className="mt-5 flex items-center justify-between gap-3"><h2 className="font-display text-xl font-black">{item.label}</h2><ArrowRight size={17} className="text-muted transition group-hover:translate-x-1 group-hover:text-primary" /></div>
              <p className="mt-2 text-sm font-semibold leading-6 text-muted">{item.desc}</p>
            </Link>
          );
        })}
      </section>

      <section className="mt-7 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-card border border-line bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase text-purple">Recent assets</p><h2 className="mt-1 font-display text-2xl font-black">最近角色</h2></div><Link href="/characters" className="text-xs font-black text-muted hover:text-primary">查看全部</Link></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {characters.slice(0, 3).map((character) => <Link key={character.id} href={`/characters/${character.id}`} className="rounded-[20px] bg-bg p-4 text-sm font-black transition hover:bg-primary/12">{character.name}<Palette size={16} className="mt-5 text-primary" /></Link>)}
            {characters.length === 0 ? <p className="sm:col-span-3 rounded-[20px] bg-bg p-5 text-sm font-semibold text-muted">还没有角色资产。完成一次创作后，角色会出现在这里。</p> : null}
          </div>
        </article>

        <article className="rounded-card border border-line bg-white p-5 shadow-soft sm:p-6">
          <p className="text-xs font-black uppercase text-primary">Settings</p><h2 className="mt-1 font-display text-2xl font-black">需要调整账户？</h2>
          <div className="mt-5 space-y-2">
            {[['账户资料与头像','/profile/settings'],['申请成为画师','/profile/artist-application'],['登录页外观','/profile/appearance']].map(([label, href]) => <Link key={href} href={href} className="flex min-h-12 items-center justify-between rounded-pill bg-bg px-4 text-sm font-black hover:bg-primary/12">{label}<ArrowRight size={16} /></Link>)}
          </div>
        </article>
      </section>
    </div>
  );
}
