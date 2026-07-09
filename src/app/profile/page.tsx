"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Download, FolderHeart, Heart, History, ReceiptText, Sparkles, UserRound } from "lucide-react";
import { LoginAppearanceSettings } from "@/components/profile/LoginAppearanceSettings";
import { accountOrders, commissionRecords, marketProducts } from "@/data/mock-platform";
import { readCharacters } from "@/lib/storage";
import type { Character } from "@/types/character";

export default function ProfilePage() {
  const [characters, setCharacters] = useState<Character[]>([]);

  useEffect(() => {
    setCharacters(readCharacters());
  }, []);

  const stats = [
    { label: "当前会员", value: "基础会员", icon: Sparkles },
    { label: "剩余点数", value: "620", icon: FolderHeart },
    { label: "已保存角色", value: String(characters.length), icon: History },
    { label: "愿望单", value: String(marketProducts.length), icon: Heart },
    { label: "订单演示", value: String(accountOrders.length), icon: ReceiptText },
    { label: "委托记录", value: String(commissionRecords.length), icon: UserRound }
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-7 grid gap-5 rounded-[36px] border border-line bg-white p-6 shadow-soft md:grid-cols-[1fr_auto] md:p-8">
        <div>
          <p className="text-xs font-black uppercase text-primary">Profile</p>
          <h1 className="mt-2 font-display text-4xl font-black md:text-6xl">我的平台资产</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">聚合角色资产、愿望单、订单、委托记录、点数和会员权益。当前只做前端静态界面。</p>
        </div>
        <div className="flex items-end">
          <Link href="/create" className="inline-flex min-h-11 items-center justify-center rounded-pill bg-ink px-5 text-sm font-black text-white">
            继续创作
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article key={stat.label} className="rounded-card border border-line bg-white p-5 shadow-soft">
              <Icon className="text-primary" size={23} aria-hidden="true" />
              <p className="mt-5 text-sm font-bold text-muted">{stat.label}</p>
              <p className="mt-1 font-display text-3xl font-black">{stat.value}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <article className="rounded-card border border-line bg-white p-5 shadow-soft">
          <h2 className="font-display text-2xl font-black">最近生成记录</h2>
          <div className="mt-5 space-y-3">
            {[
              "生成 OC 人设：会收集雨声的纸符师",
              "生成头像提示词：青井绫",
              "生成摊宣文案：星屑创作社",
              "生成对话风格：璃夏"
            ].map((record) => (
              <div key={record} className="rounded-card bg-bg px-4 py-3 text-sm font-semibold text-muted">
                {record}
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-card border border-line bg-white p-5 shadow-soft">
          <h2 className="font-display text-2xl font-black">愿望单</h2>
          <p className="mt-3 text-sm leading-6 text-muted">后续可接真实商品收藏和库存提醒。当前展示商品买卖的前端状态。</p>
          <div className="mt-5 space-y-3">
            {marketProducts.slice(0, 3).map((item) => (
              <Link key={item.id} href="/market" className="flex min-h-12 items-center justify-between rounded-pill bg-bg px-4 text-sm font-black hover:bg-primary/15">
                {item.title}
                <Heart size={16} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </article>

        <article className="rounded-card border border-line bg-white p-5 shadow-soft">
          <h2 className="font-display text-2xl font-black">订单与委托</h2>
          <p className="mt-3 text-sm leading-6 text-muted">订单和委托记录分开展示，当前不产生真实付款、退款或履约。</p>
          <div className="mt-5 space-y-3">
            {[...accountOrders.map((item) => `${item.title} · ${item.status}`), ...commissionRecords.map((item) => `${item.title} · ${item.status}`)].map((item) => (
              <div key={item} className="rounded-card bg-bg px-4 py-3 text-sm font-semibold leading-6 text-muted">
                {item}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-8 rounded-card border border-line bg-white p-5 shadow-soft">
        <h2 className="font-display text-2xl font-black">导出记录</h2>
        <p className="mt-3 text-sm leading-6 text-muted">后续可接 PDF、图片导出和云端同步。当前保留入口，便于演示完整账户路径。</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {["角色卡 PNG", "摊宣文案 TXT", "周边菜单 CSV"].map((item) => (
            <button key={item} type="button" className="flex min-h-12 items-center justify-between rounded-pill bg-bg px-4 text-sm font-black hover:bg-primary/15">
              {item}
              <Download size={16} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>

      <LoginAppearanceSettings />
    </div>
  );
}
