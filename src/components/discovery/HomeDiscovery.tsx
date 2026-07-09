"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, Bookmark, Heart, MessageCircle, Search, ShoppingBag, Sparkles, Store, Wand2 } from "lucide-react";
import { CharacterCard } from "@/components/character/CharacterCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SwipeRail } from "@/components/ui/SwipeRail";
import { boothTemplates, creationTemplates, discoveryCategories } from "@/data/mock-generations";
import { mockCharacters } from "@/data/mock-characters";
import { creatorServices, marketProducts } from "@/data/mock-platform";
import { cn } from "@/lib/utils";

const coverCards = [
  {
    title: "OC 创作工作台",
    desc: "输入一句灵感，生成完整人设、角色卡和后续创作建议。",
    href: "/create",
    image: "/images/hero-workbench.png",
    badge: "开始生成",
    credit: "AI OC Studio",
    position: "center"
  },
  {
    title: "角色资产库",
    desc: "长期保存设定、口癖、关系线和可继续生成的素材。",
    href: "/characters",
    image: "/images/case-sheet.png",
    badge: "角色卡",
    credit: "OC Library",
    position: "left top"
  },
  {
    title: "摊宣与周边",
    desc: "把商品信息改写成小红书、微博、QQ 群和 B 站动态文案。",
    href: "/booth",
    image: "/images/hero-workbench.png",
    badge: "摊主工具",
    credit: "Booth Kit",
    position: "right bottom"
  },
  {
    title: "逛商品",
    desc: "浏览头像模板、角色卡模板、徽章、立牌和轻量实体周边预览。",
    href: "/market",
    image: "/images/case-sheet.png",
    badge: "商品发现",
    credit: "Market",
    position: "center"
  },
  {
    title: "找创作者",
    desc: "从头像、立绘、摊宣和周边图案服务开始筛选创作者。",
    href: "/commissions",
    image: "/images/hero-workbench.png",
    badge: "接单服务",
    credit: "Commission",
    position: "left bottom"
  },
  {
    title: "角色互动",
    desc: "从自己的角色资产发起场景对话，测试口癖、关系和剧情张力。",
    href: "/chat",
    image: "/images/case-sheet.png",
    badge: "互动会话",
    credit: "Chat",
    position: "right top"
  },
  {
    title: "头像提示词套装",
    desc: "把角色设定整理成构图、光线、服装和负面提示词。",
    href: "/create",
    image: "/images/case-sheet.png",
    badge: "头像方向",
    credit: "Prompt Pack",
    position: "right top"
  }
];

const categoryFeatures: Record<
  string,
  {
    title: string;
    description: string;
    capabilities: string[];
    href: string;
    action: string;
    accent: string;
  }
> = {
  OC: {
    title: "从一句灵感生成完整 OC",
    description: "快速建立角色核心概念，并把零散想法整理成可以继续创作的完整资产。",
    capabilities: ["角色身份与外貌", "性格、能力与弱点", "可分享角色卡"],
    href: "/create",
    action: "开始生成 OC",
    accent: "#54c5b7"
  },
  人设: {
    title: "沉淀可长期维护的人设",
    description: "管理角色设定、关系线和说话方式，让每次后续生成都沿用同一套角色信息。",
    capabilities: ["角色资料库", "关系与背景设定", "编辑和继续生成"],
    href: "/characters",
    action: "打开角色库",
    accent: "#6283d6"
  },
  头像方向: {
    title: "整理可直接使用的头像方向",
    description: "把人物设定转成构图、光线、服装和表情要求，方便约稿或后续图像生成。",
    capabilities: ["构图与景别", "光线和色彩", "正向与负面提示词"],
    href: "/create?mode=avatar",
    action: "生成头像方向",
    accent: "#f084bc"
  },
  同人剧情: {
    title: "让角色进入真实剧情",
    description: "围绕已有角色生成冲突、开场片段和后续章节方向，保持人物行为与设定一致。",
    capabilities: ["剧情大纲", "片段正文", "后续章节建议"],
    href: "/create?mode=story",
    action: "开始剧情创作",
    accent: "#946cf3"
  },
  摊宣: {
    title: "生成适配平台的摊宣文案",
    description: "输入摊位和商品信息，输出小红书、微博、QQ 群和 B 站可直接修改使用的内容。",
    capabilities: ["平台标题与正文", "商品菜单", "价格牌文案"],
    href: "/booth",
    action: "进入摊宣工具",
    accent: "#b8ff26"
  },
  周边预览: {
    title: "规划角色周边展示方案",
    description: "围绕角色资产生成徽章、立牌、贴纸和小卡的设计说明与展示文案。",
    capabilities: ["周边品类建议", "画面与材质说明", "预售展示文案"],
    href: "/booth?mode=merch",
    action: "规划周边方案",
    accent: "#f2b84b"
  }
};

export function HomeDiscovery() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("OC");
  const [activeCoverIndex, setActiveCoverIndex] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const activeCategoryFeature = categoryFeatures[activeCategory] ?? categoryFeatures.OC;

  useEffect(() => {
    if (isCarouselPaused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveCoverIndex((current) => (current + 1) % coverCards.length);
    }, 3600);

    return () => window.clearInterval(timer);
  }, [isCarouselPaused]);

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
      <section className="mx-auto max-w-[1920px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(420px,0.78fr)] lg:items-end">
          <div className="max-w-[860px]">
            <p className="oc-kicker mb-3 text-[11px] font-black text-primary">AI OC Studio</p>
            <h1 className="oc-title text-[clamp(2.45rem,4.9vw,5.15rem)] font-black leading-[1.02]">
              让每个 OC 灵感，立刻变成可创作资产
            </h1>
            <p className="mt-5 max-w-2xl text-base font-bold leading-7 text-muted sm:text-lg">
              从一句设定开始，整理角色卡、头像方向、剧情片段、摊宣文案和周边预览。
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["角色卡", "剧情片段", "头像提示词", "摊宣菜单"].map((item) => (
                <span key={item} className="rounded-pill border border-line bg-white/78 px-3 py-1 text-xs font-black text-muted shadow-[0_8px_22px_rgba(18,16,22,0.05)]">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <form
            className="oc-panel flex w-full flex-col gap-3 rounded-[30px] p-2 sm:flex-row lg:max-w-[760px] lg:justify-self-end"
            onSubmit={(event) => {
              event.preventDefault();
              window.location.href = `/create?idea=${encodeURIComponent(query || "会收集星光碎片的 OC")}`;
            }}
          >
            <label className="sr-only" htmlFor="home-search">
              搜索创作模板或输入角色灵感
            </label>
            <div className="flex min-h-12 flex-1 items-center gap-3 rounded-pill bg-bg/80 px-4 ring-1 ring-inset ring-white">
              <Search size={19} className="text-muted" aria-hidden="true" />
              <input
                id="home-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full bg-transparent text-base font-semibold outline-none placeholder:text-muted"
                placeholder="搜索模板，或输入角色灵感"
              />
            </div>
            <button
              type="submit"
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-pill bg-ink px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(18,16,22,0.18)] transition hover:bg-primary hover:text-ink"
            >
              立即创建
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </form>
        </div>

        <div
          className="mt-8"
          aria-label="核心功能轮播"
          onMouseEnter={() => setIsCarouselPaused(true)}
          onMouseLeave={() => setIsCarouselPaused(false)}
          onFocus={() => setIsCarouselPaused(true)}
          onBlur={() => setIsCarouselPaused(false)}
        >
          <div className="relative isolate h-[300px] overflow-hidden [perspective:1400px] sm:h-[380px] lg:h-[470px]">
            {coverCards.map((card, index) => {
              const active = index === activeCoverIndex;
              const relativePosition = (index - activeCoverIndex + coverCards.length) % coverCards.length;
              const stagePosition = relativePosition === coverCards.length - 1 ? -1 : relativePosition;
              const stageStyles =
                stagePosition === 0
                  ? { transform: "translate3d(-50%, 0, 0) scale(1)", filter: "blur(0px)", opacity: 1, zIndex: 4 }
                  : stagePosition === -1
                    ? { transform: "translate3d(-88%, 7%, -150px) scale(0.82)", filter: "blur(4px)", opacity: 0.56, zIndex: 2 }
                    : stagePosition === 1
                      ? { transform: "translate3d(-12%, 7%, -150px) scale(0.82)", filter: "blur(4px)", opacity: 0.56, zIndex: 2 }
                      : { transform: "translate3d(-50%, 12%, -260px) scale(0.68)", filter: "blur(10px)", opacity: 0.28, zIndex: 1 };

              return (
                <Link
                  key={card.title}
                  href={card.href}
                  tabIndex={active ? 0 : -1}
                  aria-hidden={!active}
                  className={cn(
                    "asset-sheen group absolute left-1/2 top-0 h-full w-[86%] overflow-hidden rounded-[30px] border border-white/80 shadow-[0_30px_90px_rgba(18,16,22,0.16)] transition-[transform,filter,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] sm:w-[78%] lg:rounded-[34px]",
                    active ? "pointer-events-auto" : "pointer-events-none"
                  )}
                  style={stageStyles}
                >
                  <Image
                    src={card.image}
                    alt={`${card.title} 封面图`}
                    fill
                    priority={index === 0}
                    sizes="(max-width: 1024px) 100vw, 1320px"
                    className="object-cover"
                    style={{ objectPosition: card.position }}
                  />
                  <div className="absolute inset-0 bg-ink/42" />
                  <div className="absolute inset-0 bg-gradient-to-r from-ink/86 via-ink/34 to-transparent" />
                  <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/22 to-transparent" />
                  <div className="absolute left-5 right-5 top-5 sm:left-9 sm:right-9 sm:top-8">
                    <span className="inline-flex rounded-pill bg-lime px-3 py-1 text-xs font-black text-ink shadow-[0_8px_20px_rgba(204,255,56,0.28)]">{card.badge}</span>
                    <h2 className="oc-title mt-5 max-w-xl text-3xl font-black leading-tight text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.9)] sm:text-5xl">
                      {card.title}
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] sm:text-lg sm:leading-8">
                      {card.desc}
                    </p>
                  </div>
                  <div className="absolute bottom-5 right-5 inline-flex min-h-10 items-center gap-2 rounded-pill border border-white/22 bg-white/24 px-3 text-sm font-black text-white backdrop-blur">
                    <span className="grid size-7 place-items-center rounded-pill bg-primary text-ink">
                      <Sparkles size={15} aria-hidden="true" />
                    </span>
                    {card.credit}
                  </div>
                  <span className="absolute bottom-5 left-5 inline-flex min-h-10 items-center gap-2 rounded-pill bg-white px-4 text-sm font-black text-ink opacity-0 shadow-soft transition group-hover:opacity-100 group-focus-visible:opacity-100">
                    进入功能
                    <ArrowRight size={16} aria-hidden="true" />
                  </span>
                </Link>
              );
            })}

            <div
              className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center justify-center gap-1 opacity-60 drop-shadow-[0_1px_2px_rgba(255,255,255,0.45)] transition-opacity hover:opacity-85"
              role="group"
              aria-label="选择功能窗口"
            >
              {coverCards.map((card, index) => {
                const active = index === activeCoverIndex;
                return (
                  <button
                    key={card.title}
                    type="button"
                    onClick={() => setActiveCoverIndex(index)}
                    onMouseEnter={() => setActiveCoverIndex(index)}
                    className="grid size-9 place-items-center rounded-full transition hover:bg-ink/5"
                    aria-label={`显示${card.title}`}
                    aria-pressed={active}
                  >
                    <span className={cn("size-2.5 rounded-full transition-all duration-300", active ? "scale-110 bg-[rgba(12,9,13,0.7)]" : "bg-[rgba(12,9,13,0.22)]")} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1920px] px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <h2 className="oc-title text-3xl font-black leading-tight md:text-4xl">12,000+ 创作模板、商品与创作者服务</h2>
          <Link
            href="/create"
            className="inline-flex min-h-12 w-fit items-center justify-center gap-2 rounded-pill border border-line bg-white px-5 text-sm font-black shadow-soft transition hover:bg-primary/15"
          >
            全部分类
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
        <SwipeRail className="items-center">
          {discoveryCategories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              aria-pressed={activeCategory === category}
              className={cn(
                "flex min-h-16 min-w-[148px] snap-start items-center gap-3 rounded-pill border border-transparent bg-white/24 px-2 text-left text-sm font-black transition hover:-translate-y-1 hover:bg-white/70",
                activeCategory === category && "border-white bg-white shadow-soft"
              )}
            >
              <span className="grid size-14 shrink-0 place-items-center rounded-pill bg-[radial-gradient(circle_at_30%_25%,#ffffff_0,#ff7db5_22%,#8a6cff_58%,#32c4b6_100%)] text-sm font-black text-white shadow-soft">
                {category.slice(0, 2)}
              </span>
              <span className="leading-tight text-ink">{category}</span>
            </button>
          ))}
        </SwipeRail>

        <div
          className="oc-panel mt-6 grid gap-6 rounded-[28px] p-5 md:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)_auto] md:items-center md:p-6"
          aria-live="polite"
        >
          <div className="border-l-4 pl-5" style={{ borderColor: activeCategoryFeature.accent }}>
            <p className="oc-kicker text-[11px] font-black text-muted">{activeCategory}</p>
            <h3 className="oc-title mt-1 text-2xl font-black md:text-3xl">{activeCategoryFeature.title}</h3>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-muted">{activeCategoryFeature.description}</p>
          </div>

          <ul className="grid gap-2 sm:grid-cols-3 md:grid-cols-1">
            {activeCategoryFeature.capabilities.map((capability) => (
              <li key={capability} className="flex items-center gap-2 text-sm font-bold text-ink">
                <BadgeCheck size={17} className="shrink-0 text-primary" aria-hidden="true" />
                {capability}
              </li>
            ))}
          </ul>

          <Link
            href={activeCategoryFeature.href}
            className="inline-flex min-h-12 w-fit items-center justify-center gap-2 rounded-pill bg-ink px-5 text-sm font-black text-white transition hover:bg-primary hover:text-ink"
          >
            {activeCategoryFeature.action}
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
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
            <Link key={template.title} href="/create" className="clip-card oc-panel rounded-card p-5 transition hover:-translate-y-1">
              <span className="inline-flex rounded-pill px-3 py-1 text-xs font-black text-ink" style={{ backgroundColor: template.accent }}>
                {template.label}
              </span>
              <h3 className="oc-title mt-5 text-2xl font-black">{template.title}</h3>
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
              className="oc-panel min-w-[240px] snap-start rounded-card p-5 transition hover:-translate-y-1"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="grid size-12 place-items-center rounded-pill bg-lime text-sm font-black">{index + 1}</span>
                {index % 2 === 0 ? <BadgeCheck size={20} className="text-primary" aria-hidden="true" /> : <Bookmark size={20} className="text-purple" aria-hidden="true" />}
              </div>
              <h3 className="oc-title text-xl font-black">{template}</h3>
              <p className="mt-3 text-sm leading-6 text-muted">点击进入工具页，输入商品信息后生成可复制结果。</p>
            </Link>
          ))}
        </SwipeRail>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Market"
          title="逛商品"
          desc="先用前端 mock 展示数字商品与轻量实体周边预览，愿望单和购物车只做演示状态。"
          action={
            <Link href="/market" className="inline-flex min-h-11 items-center gap-2 rounded-pill bg-white px-5 text-sm font-black shadow-soft">
              进入逛商品
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          }
        />
        <SwipeRail>
          {marketProducts.map((product) => (
            <Link key={product.id} href="/market" className="oc-panel min-w-[260px] snap-start rounded-card p-5 transition hover:-translate-y-1">
              <div className="mb-5 flex items-start justify-between gap-3">
                <span className="grid size-12 place-items-center rounded-pill text-ink" style={{ backgroundColor: product.accent }}>
                  <ShoppingBag size={19} aria-hidden="true" />
                </span>
                <span className="rounded-pill bg-bg px-3 py-1 text-xs font-black text-muted">{product.kind}</span>
              </div>
              <h3 className="oc-title text-xl font-black">{product.title}</h3>
              <p className="mt-2 text-sm font-bold text-muted">{product.creator}</p>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">{product.desc}</p>
              <div className="mt-5 flex items-center justify-between">
                <span className="text-lg font-black">¥{product.price}</span>
                <span className="text-xs font-black text-primary">{product.status}</span>
              </div>
            </Link>
          ))}
        </SwipeRail>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Commission"
          title="找创作者"
          desc="从服务卡片开始浏览头像、摊宣和周边图案接单，创作者主页承载信任信息。"
          action={
            <Link href="/commissions" className="inline-flex min-h-11 items-center gap-2 rounded-pill bg-white px-5 text-sm font-black shadow-soft">
              查看服务
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          }
        />
        <div className="grid gap-4 md:grid-cols-3">
          {creatorServices.map((service) => (
            <Link key={service.id} href="/commissions" className="oc-panel rounded-card p-5 transition hover:-translate-y-1">
              <div className="flex items-center justify-between gap-3">
                <span className="grid size-12 place-items-center rounded-pill text-ink" style={{ backgroundColor: service.accent }}>
                  <Store size={19} aria-hidden="true" />
                </span>
                <span className="rounded-pill bg-bg px-3 py-1 text-xs font-black text-muted">{service.status}</span>
              </div>
              <h3 className="oc-title mt-5 text-xl font-black">{service.title}</h3>
              <p className="mt-2 text-sm font-bold text-muted">{service.creator} · {service.priceRange}</p>
              <p className="mt-3 text-sm leading-6 text-muted">{service.sample}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="oc-panel grid gap-5 rounded-[32px] p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div>
            <p className="oc-kicker text-[11px] font-black text-primary">Role Interaction</p>
            <h2 className="oc-title mt-2 text-3xl font-black">从自己的角色资产开始互动会话</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">角色互动用于测试口癖、关系动态和场景对话，不做预置陪聊角色池。</p>
          </div>
          <Link href="/chat" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-pill bg-ink px-5 text-sm font-black text-white">
            <MessageCircle size={17} aria-hidden="true" />
            进入角色互动
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-5 rounded-[32px] bg-ink p-6 text-white shadow-[0_28px_80px_rgba(18,16,22,0.18)] md:grid-cols-[1.4fr_0.6fr] md:p-8">
          <div>
            <p className="oc-kicker text-[11px] font-black text-lime">Pricing Entry</p>
            <h2 className="oc-title mt-2 text-3xl font-black">先用免费版跑通角色，再按点数升级创作量。</h2>
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
