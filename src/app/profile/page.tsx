"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Crown,
  Download,
  FolderHeart,
  Heart,
  Palette,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UserRound
} from "lucide-react";
import { LoginAppearanceSettings } from "@/components/profile/LoginAppearanceSettings";
import { AccountBackendPanel } from "@/components/profile/AccountBackendPanel";
import { NotificationBadge } from "@/components/notifications/NotificationBadge";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { FeatureArtPanel } from "@/components/layout/FeatureArtPanel";
import { ProfileBackendStats } from "@/components/profile/ProfileBackendStats";
import { readCharacters } from "@/lib/storage";
import type { Character } from "@/types/character";

const quickActions = [
  { href: "/studio", label: "继续创作", desc: "生成角色设定、头像方向和后续创作内容。", icon: Sparkles },
  { href: "/characters", label: "角色资产库", desc: "查看、编辑、删除已保存的长期角色资产。", icon: FolderHeart },
  { href: "/profile/orders", label: "商品订单", desc: "查看付款、交付、物流和退款状态。", icon: Heart },
  { href: "/profile/commissions", label: "我的委托", desc: "确认报价、审核交付并查看争议状态。", icon: ReceiptText }
];

export default function ProfilePage() {
  const [characters, setCharacters] = useState<Character[]>([]);

  useEffect(() => {
    setCharacters(readCharacters());
  }, []);

  return (
    <div className="profile-page mx-auto min-h-[calc(100dvh-5rem)] max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-7 overflow-hidden rounded-[36px] border border-line bg-white shadow-soft">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_360px] md:p-8">
          <div>
            <div className="inline-flex min-h-10 items-center gap-2 rounded-pill bg-bg px-4 text-sm font-black text-muted">
              <Crown size={18} aria-hidden="true" />
              会员中心
            </div>
            <h1 className="mt-4 font-display text-4xl font-black md:text-6xl">我的用户中心</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
              管理真实账户资料、画师入驻、角色资产、愿望单、订单和委托记录。
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/studio" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-pill bg-ink px-5 text-sm font-black text-white">
                <Sparkles size={17} aria-hidden="true" />
                继续创作
              </Link>
              <Link href="/pricing" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-pill border border-line bg-white px-5 text-sm font-black text-ink">
                <ShieldCheck size={17} aria-hidden="true" />
                查看会员权益
              </Link>
            </div>
            <FeatureArtPanel src="/images/artwork/pink-cafe.jpg" alt="粉色咖啡馆场景中的原创角色插画" eyebrow="我的创作资产" caption="从个人中心继续管理角色、订单、委托和生成记录" className="mt-6 min-h-[170px]" />
          </div>

          <aside className="rounded-[28px] bg-ink p-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-white/54">Current Plan</p>
                <h2 className="mt-2 font-display text-3xl font-black">基础会员</h2>
              </div>
              <span className="grid size-14 place-items-center rounded-pill bg-gradient-to-br from-purple to-pink text-xl font-black">艾</span>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-[20px] bg-white/10 p-4">
                <p className="text-xs font-bold text-white/60">点数余额</p>
                <p className="mt-1 font-display text-3xl font-black">620</p>
              </div>
              <div className="rounded-[20px] bg-lime p-4 text-ink">
                <p className="text-xs font-bold text-ink/60">通知</p>
                <p className="mt-1 font-display text-3xl font-black"><NotificationBadge compact /></p>
              </div>
            </div>
            <p className="mt-5 text-sm font-semibold leading-6 text-white/68">本月可导出角色卡、保存创作记录，并使用会员模板入口。</p>
          </aside>
        </div>
      </section>

      <AccountBackendPanel />

      <ProfileBackendStats characterCount={characters.length} />

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <NotificationCenter />

        <article className="rounded-card border border-line bg-white p-5 shadow-soft">
          <h2 className="font-display text-2xl font-black">会员权益</h2>
          <div className="mt-5 space-y-3">
            {[
              "每月 620 点可用于模拟生成与导出入口",
              "角色卡 PNG、摊宣文案 TXT、周边菜单 CSV 导出入口",
              "优先保存角色资产与创作记录"
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-[20px] border border-line bg-white px-4 py-3 text-sm font-bold text-muted">
                <ShieldCheck size={17} className="text-primary" aria-hidden="true" />
                {item}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-4">
        {quickActions.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="rounded-card border border-line bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-primary">
              <span className="grid size-11 place-items-center rounded-pill bg-primary/12 text-primary">
                <Icon size={20} aria-hidden="true" />
              </span>
              <h2 className="mt-5 font-display text-xl font-black">{item.label}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-muted">{item.desc}</p>
            </Link>
          );
        })}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <article className="rounded-card border border-line bg-white p-5 shadow-soft">
          <h2 className="font-display text-2xl font-black">最近生成记录</h2>
          <div className="mt-5 space-y-3">
            {["生成 OC 人设：会收集雨声的纸符师", "生成头像提示词：青井绫", "生成摊宣文案：星屑创作社", "生成对话风格：璃夏"].map((record) => (
              <div key={record} className="rounded-card bg-bg px-4 py-3 text-sm font-semibold text-muted">
                {record}
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-card border border-line bg-white p-5 shadow-soft">
          <h2 className="font-display text-2xl font-black">最近角色</h2>
          <div className="mt-5 space-y-3">
            {(characters.length > 0 ? characters.slice(0, 3) : []).map((character) => (
              <Link key={character.id} href={`/characters/${character.id}`} className="flex min-h-12 items-center justify-between rounded-pill bg-bg px-4 text-sm font-black hover:bg-primary/15">
                {character.name}
                <Palette size={16} aria-hidden="true" />
              </Link>
            ))}
            {characters.length === 0 ? <p className="rounded-card bg-bg px-4 py-3 text-sm font-semibold text-muted">还没有保存角色，先去创作页生成一个 OC。</p> : null}
          </div>
        </article>

        <article className="rounded-card border border-line bg-white p-5 shadow-soft">
          <h2 className="font-display text-2xl font-black">订单与委托</h2>
          <div className="mt-5 space-y-3">
            <Link href="/profile/orders" className="flex min-h-12 items-center justify-between rounded-pill bg-bg px-4 text-sm font-black hover:bg-primary/15">商品订单<ReceiptText size={16} /></Link>
            <Link href="/profile/commissions" className="flex min-h-12 items-center justify-between rounded-pill bg-bg px-4 text-sm font-black hover:bg-primary/15">委托记录<UserRound size={16} /></Link>
          </div>
        </article>
      </section>

      <section className="mt-8 rounded-card border border-line bg-white p-5 shadow-soft">
        <h2 className="font-display text-2xl font-black">导出与复用工具</h2>
        <p className="mt-3 text-sm leading-6 text-muted">进入已有创作工具查看角色摘要，或生成可复制的摊宣文案与商品菜单。</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            ["角色卡与摘要", "/characters"],
            ["摊宣文案", "/booth"],
            ["周边商品菜单", "/booth"]
          ].map(([item, href]) => (
            <Link key={item} href={href} className="flex min-h-12 items-center justify-between rounded-pill bg-bg px-4 text-sm font-black hover:bg-primary/15">
              {item}
              <Download size={16} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <LoginAppearanceSettings />
    </div>
  );
}
