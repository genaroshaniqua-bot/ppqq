"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, Bookmark, Heart, Search, Sparkles, Wand2 } from "lucide-react";
import { CharacterCard } from "@/components/character/CharacterCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SwipeRail } from "@/components/ui/SwipeRail";
import { boothTemplates, creationTemplates, discoveryCategories } from "@/data/mock-generations";
import { mockCharacters } from "@/data/mock-characters";
import { cn } from "@/lib/utils";

const heroCards = [
  {
    title: "OC 创作助手",
    desc: "从一句灵感生成完整人设、角色卡和后续创作建议。",
    href: "/create",
    color: "bg-primary"
  },
  {
    title: "角色资产库",
    desc: "长期保存设定、口癖、关系线和可继续生成的素材。",
    href: "/characters",
    color: "bg-purple text-white"
  },
  {
    title: "摊宣工具",
    desc: "把商品信息改写成小红书、微博、QQ 群和 B 站动态文案。",
    href: "/booth",
    color: "bg-pink"
  }
];

export function HomeDiscovery() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("OC");
  const [saved, setSaved] = useState<string[]>([]);

  const filteredCharacters = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return mockCharacters.filter((character) => {
      const byCategory = activeCategory === "OC" || character.tags.join("").includes(activeCategory);
      const byQuery =
        !keyword ||
        [character.name, character.identity, character.summary, character.tags.join(" ")].join(" ").toLowerCase().includes(keyword);
      return byCategory && byQuery;
    });
  }, [activeCategory, query]);

  function toggleSaved(id: string) {
    setSaved((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <div>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-12">
        <div className="flex flex-col justify-center">
          <p className="mb-4 inline-flex w-fit items-center gap-2 rounded-pill bg-white px-4 py-2 text-xs font-black uppercase text-primary shadow-soft">
            <Sparkles size={15} aria-hidden="true" />
            AI 二次元创作工具平台
          </p>
          <h1 className="max-w-3xl font-display text-4xl font-black leading-[1.05] sm:text-5xl md:text-7xl">
            从一句灵感，生成能继续创作的 OC 资产。
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-muted md:text-lg">
            快速生成角色设定、角色卡、头像方向、剧情片段、摊宣文案和周边预览方案。首页就是创作发现页，打开就能开始。
          </p>

          <form
            className="mt-7 flex max-w-2xl flex-col gap-3 rounded-[28px] border border-line bg-white p-2 shadow-soft sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              window.location.href = `/create?idea=${encodeURIComponent(query || "会收集星光碎片的 OC")}`;
            }}
          >
            <label className="sr-only" htmlFor="home-search">
              搜索创作模板或输入角色灵感
            </label>
            <div className="flex min-h-12 flex-1 items-center gap-3 rounded-pill bg-bg px-4">
              <Search size={19} className="text-muted" aria-hidden="true" />
              <input
                id="home-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full bg-transparent text-base font-semibold outline-none placeholder:text-muted"
                placeholder="输入灵感：雨夜、猫耳机械师、旧校舍广播..."
              />
            </div>
            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-pill bg-ink px-5 text-sm font-black text-white transition hover:bg-primary hover:text-ink"
            >
              立即创建
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </form>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {heroCards.map((card) => (
              <Link key={card.title} href={card.href} className={cn("rounded-card p-4 shadow-soft transition hover:-translate-y-1", card.color)}>
                <h2 className="font-display text-lg font-black">{card.title}</h2>
                <p className="mt-2 text-sm font-semibold leading-6 opacity-80">{card.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="relative min-h-[520px] overflow-hidden rounded-[36px] border border-line bg-white shadow-soft">
          <Image
            src="/images/hero-workbench.png"
            alt="AI OC 创作工作台背景图"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/62 via-transparent to-white/20" />
          <div className="absolute bottom-5 left-5 right-5 grid gap-3 sm:grid-cols-3">
            {["角色卡", "头像提示词", "周边方案"].map((item, index) => (
              <div key={item} className="rounded-card bg-white/88 p-4 backdrop-blur">
                <p className="text-xs font-black text-muted">STEP {index + 1}</p>
                <p className="mt-1 font-display text-lg font-black">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SwipeRail>
          {discoveryCategories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={cn(
                "flex min-h-24 min-w-24 snap-start flex-col items-center justify-center gap-2 rounded-pill border border-line bg-white px-4 text-sm font-black shadow-soft transition hover:-translate-y-1",
                activeCategory === category && "border-ink bg-ink text-white"
              )}
            >
              <span className="grid size-11 place-items-center rounded-pill bg-primary/18 text-ink">
                {category.slice(0, 2)}
              </span>
              {category}
            </button>
          ))}
        </SwipeRail>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Character Rail"
          title="角色卡示例"
          desc="横向浏览示例角色，像逛作品流一样快速感知生成结果。收藏按钮只做前端演示状态。"
          action={
            <Link href="/characters" className="inline-flex min-h-11 items-center gap-2 rounded-pill bg-white px-5 text-sm font-black shadow-soft">
              查看角色库
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          }
        />
        <SwipeRail>
          {filteredCharacters.map((character) => (
            <div key={character.id} className="relative">
              <CharacterCard character={character} compact />
              <button
                type="button"
                onClick={() => toggleSaved(character.id)}
                className={cn(
                  "absolute right-3 top-3 grid min-h-11 min-w-11 place-items-center rounded-pill bg-white/92 text-ink shadow-soft backdrop-blur transition",
                  saved.includes(character.id) && "bg-pink text-white"
                )}
                aria-label={`${saved.includes(character.id) ? "取消收藏" : "收藏"} ${character.name}`}
              >
                <Heart size={18} fill={saved.includes(character.id) ? "currentColor" : "none"} aria-hidden="true" />
              </button>
            </div>
          ))}
          {filteredCharacters.length === 0 ? (
            <div className="min-w-[280px] rounded-card border border-dashed border-line bg-white p-6 text-sm font-semibold text-muted">
              没有匹配结果。换个关键词，或直接进入创作页生成新的 OC。
            </div>
          ) : null}
        </SwipeRail>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Template Rail" title="创作模板" desc="模板不是营销卡片，而是后续工作流入口：角色卡、剧情、对话和头像提示词。" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {creationTemplates.map((template) => (
            <Link key={template.title} href="/create" className="clip-card rounded-card border border-line bg-white p-5 shadow-soft transition hover:-translate-y-1">
              <span className="inline-flex rounded-pill px-3 py-1 text-xs font-black text-ink" style={{ backgroundColor: template.accent }}>
                {template.label}
              </span>
              <h3 className="mt-5 font-display text-2xl font-black">{template.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted">{template.desc}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-black">
                开始生成
                <Wand2 size={16} aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Booth / Merch" title="摊宣与周边方向" desc="面向 Coser、摊主和社团，把商品信息变成平台文案、菜单和价格牌。" />
        <SwipeRail>
          {boothTemplates.map((template, index) => (
            <Link
              key={template}
              href="/booth"
              className="min-w-[240px] snap-start rounded-card border border-line bg-white p-5 shadow-soft transition hover:-translate-y-1"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="grid size-12 place-items-center rounded-pill bg-lime text-sm font-black">{index + 1}</span>
                {index % 2 === 0 ? <BadgeCheck size={20} className="text-primary" aria-hidden="true" /> : <Bookmark size={20} className="text-purple" aria-hidden="true" />}
              </div>
              <h3 className="font-display text-xl font-black">{template}</h3>
              <p className="mt-3 text-sm leading-6 text-muted">点击进入工具页，输入商品信息后生成可复制结果。</p>
            </Link>
          ))}
        </SwipeRail>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-5 rounded-[32px] bg-ink p-6 text-white shadow-soft md:grid-cols-[1.4fr_0.6fr] md:p-8">
          <div>
            <p className="text-xs font-black uppercase text-lime">Pricing Entry</p>
            <h2 className="mt-2 font-display text-3xl font-black">先用免费版跑通角色，再按点数升级创作量。</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">当前页面只做前端展示，不接支付；商业结构保留免费版、会员、点数和单次项目。</p>
          </div>
          <div className="flex items-end">
            <Link href="/pricing" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-pill bg-lime px-5 text-sm font-black text-ink">
              查看定价
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
