"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
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
      <section className="mx-auto max-w-[1920px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.68fr)] lg:items-center">
          <h1 className="font-display text-[clamp(2.7rem,6.8vw,5.8rem)] font-black leading-[1.03]">
            让每个 OC 灵感，都能立刻变成可创作资产
          </h1>
          <form
            className="flex w-full flex-col gap-3 rounded-[32px] border border-line bg-white p-2 shadow-soft sm:flex-row lg:justify-self-end"
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
                placeholder="搜索模板，或输入角色灵感"
              />
            </div>
            <button
              type="submit"
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-pill bg-ink px-5 text-sm font-black text-white transition hover:bg-primary hover:text-ink"
            >
              立即创建
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </form>
        </div>

        <SwipeRail className="mt-8 lg:gap-5">
          {coverCards.map((card, index) => (
            <Link
              key={card.title}
              href={card.href}
              className="group relative h-[230px] min-w-[86vw] snap-start overflow-hidden rounded-[32px] bg-ink shadow-soft transition hover:-translate-y-1 sm:h-[270px] sm:min-w-[620px] lg:h-[300px] lg:min-w-[720px]"
            >
              <Image
                src={card.image}
                alt={`${card.title} 封面图`}
                fill
                priority={index < 2}
                sizes="(max-width: 640px) 86vw, 720px"
                className="object-cover transition duration-300 group-hover:scale-[1.03]"
                style={{ objectPosition: card.position }}
              />
              <div className="absolute inset-0 bg-ink/60" />
              <div className="absolute inset-0 bg-gradient-to-r from-ink/88 via-ink/38 to-ink/10" />
              <div className="absolute left-5 right-5 top-5 sm:left-9 sm:right-9 sm:top-8">
                <span className="inline-flex rounded-pill bg-lime px-3 py-1 text-xs font-black text-ink">{card.badge}</span>
                <h2 className="mt-4 max-w-xl font-display text-2xl font-black leading-tight text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.9)] sm:mt-5 sm:text-4xl">
                  {card.title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] sm:mt-3 sm:text-base sm:leading-7">
                  {card.desc}
                </p>
              </div>
              <div className="absolute bottom-5 right-5 inline-flex min-h-10 items-center gap-2 rounded-pill bg-white/22 px-3 text-sm font-black text-white backdrop-blur">
                <span className="grid size-7 place-items-center rounded-pill bg-primary text-ink">
                  <Sparkles size={15} aria-hidden="true" />
                </span>
                {card.credit}
              </div>
            </Link>
          ))}
        </SwipeRail>
      </section>

      <section className="mx-auto max-w-[1920px] px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <h2 className="font-display text-3xl font-black md:text-4xl">12,000+ 创作模板、商品与创作者服务</h2>
          <Link
            href="/create"
            className="inline-flex min-h-12 w-fit items-center justify-center gap-2 rounded-pill bg-white px-5 text-sm font-black shadow-soft transition hover:bg-primary/15"
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
              className={cn(
                "flex min-h-16 min-w-[148px] snap-start items-center gap-3 rounded-pill border border-transparent bg-transparent px-2 text-left text-sm font-black transition hover:-translate-y-1",
                activeCategory === category && "bg-white shadow-soft"
              )}
            >
              <span className="grid size-14 shrink-0 place-items-center rounded-pill bg-[radial-gradient(circle_at_30%_25%,#ffffff_0,#f084bc_22%,#946cf3_58%,#54c5b7_100%)] text-sm font-black text-white shadow-soft">
                {category.slice(0, 2)}
              </span>
              <span className="leading-tight text-ink">{category}</span>
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
            <Link key={product.id} href="/market" className="min-w-[260px] snap-start rounded-card border border-line bg-white p-5 shadow-soft transition hover:-translate-y-1">
              <div className="mb-5 flex items-start justify-between gap-3">
                <span className="grid size-12 place-items-center rounded-pill text-ink" style={{ backgroundColor: product.accent }}>
                  <ShoppingBag size={19} aria-hidden="true" />
                </span>
                <span className="rounded-pill bg-bg px-3 py-1 text-xs font-black text-muted">{product.kind}</span>
              </div>
              <h3 className="font-display text-xl font-black">{product.title}</h3>
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
            <Link key={service.id} href="/commissions" className="rounded-card border border-line bg-white p-5 shadow-soft transition hover:-translate-y-1">
              <div className="flex items-center justify-between gap-3">
                <span className="grid size-12 place-items-center rounded-pill text-ink" style={{ backgroundColor: service.accent }}>
                  <Store size={19} aria-hidden="true" />
                </span>
                <span className="rounded-pill bg-bg px-3 py-1 text-xs font-black text-muted">{service.status}</span>
              </div>
              <h3 className="mt-5 font-display text-xl font-black">{service.title}</h3>
              <p className="mt-2 text-sm font-bold text-muted">{service.creator} · {service.priceRange}</p>
              <p className="mt-3 text-sm leading-6 text-muted">{service.sample}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-5 rounded-[32px] border border-line bg-white p-6 shadow-soft md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div>
            <p className="text-xs font-black uppercase text-primary">Role Interaction</p>
            <h2 className="mt-2 font-display text-3xl font-black">从自己的角色资产开始互动会话</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">角色互动用于测试口癖、关系动态和场景对话，不做预置陪聊角色池。</p>
          </div>
          <Link href="/chat" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-pill bg-ink px-5 text-sm font-black text-white">
            <MessageCircle size={17} aria-hidden="true" />
            进入角色互动
          </Link>
        </div>
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
