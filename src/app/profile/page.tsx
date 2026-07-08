"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Download, FolderHeart, History, Sparkles } from "lucide-react";
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
    { label: "可导出记录", value: "12", icon: Download }
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-7 grid gap-5 rounded-[36px] border border-line bg-white p-6 shadow-soft md:grid-cols-[1fr_auto] md:p-8">
        <div>
          <p className="text-xs font-black uppercase text-primary">Profile</p>
          <h1 className="mt-2 font-display text-4xl font-black md:text-6xl">我的创作空间</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">这里展示账户、点数、角色资产和最近生成记录。当前只做前端静态界面。</p>
        </div>
        <div className="flex items-end">
          <Link href="/create" className="inline-flex min-h-11 items-center justify-center rounded-pill bg-ink px-5 text-sm font-black text-white">
            继续创作
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
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

      <section className="mt-8 grid gap-6 lg:grid-cols-[0.58fr_0.42fr]">
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
          <h2 className="font-display text-2xl font-black">导出记录</h2>
          <p className="mt-3 text-sm leading-6 text-muted">后续可接 PDF、图片导出和云端同步。当前保留入口，便于演示完整账户路径。</p>
          <div className="mt-5 space-y-3">
            {["角色卡 PNG", "摊宣文案 TXT", "周边菜单 CSV"].map((item) => (
              <button key={item} type="button" className="flex min-h-12 w-full items-center justify-between rounded-pill bg-bg px-4 text-sm font-black hover:bg-primary/15">
                {item}
                <Download size={16} aria-hidden="true" />
              </button>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
