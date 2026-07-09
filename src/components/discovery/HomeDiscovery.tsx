"use client";

import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenText,
  Bot,
  Boxes,
  Brush,
  FolderHeart,
  Heart,
  MessageCircle,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  Wand2
} from "lucide-react";
import { useMemo, useState } from "react";
import { CharacterCard } from "@/components/character/CharacterCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SwipeRail } from "@/components/ui/SwipeRail";
import { boothTemplates, creationTemplates, discoveryCategories } from "@/data/mock-generations";
import { mockCharacters } from "@/data/mock-characters";
import { creatorServices, marketProducts } from "@/data/mock-platform";
import { cn } from "@/lib/utils";

type FeatureEntry = {
  title: string;
  desc: string;
  href: string;
  action: string;
  icon: LucideIcon;
  tone: string;
};

const featureEntries: FeatureEntry[] = [
  {
    title: "OC 创作",
    desc: "生成 OC 人设、外观、世界观与故事方向。",
    href: "/create",
    action: "开始创作",
    icon: Brush,
    tone: "from-[#8be5df]/38 to-[#f9f5ff]/70"
  },
  {
    title: "角色资产",
    desc: "管理头像、立绘、设定、口癖和周边方向。",
    href: "/characters",
    action: "打开资产库",
    icon: FolderHeart,
    tone: "from-[#f7a9d4]/34 to-[#ffffff]/72"
  },
  {
    title: "灵感工具",
    desc: "随机设定、关键词扩写、风格参考一键续写。",
    href: "/create?mode=idea",
    action: "浏览灵感",
    icon: Sparkles,
    tone: "from-[#bfa7ff]/34 to-[#f8fbff]/72"
  },
  {
    title: "找创作者",
    desc: "浏览约稿、头像、立绘、周边设计服务。",
    href: "/commissions",
    action: "查看服务",
    icon: Store,
    tone: "from-[#ffe4ac]/38 to-[#fff8fb]/74"
  },
  {
    title: "角色互动",
    desc: "与自己的 OC 进行剧情、关系和对话测试。",
    href: "/chat",
    action: "进入互动",
    icon: MessageCircle,
    tone: "from-[#a9cdfb]/38 to-[#fffafe]/74"
  },
  {
    title: "我的空间",
    desc: "聚合收藏、订单、资产库和委托记录。",
    href: "/profile",
    action: "进入我的",
    icon: Boxes,
    tone: "from-[#d9ff9f]/28 to-[#ffffff]/78"
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
    accent: "#9c7cf4"
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
    accent: "#d9b86d"
  },
  周边预览: {
    title: "规划角色周边展示方案",
    description: "围绕角色资产生成徽章、立牌、贴纸和小卡的设计说明与展示文案。",
    capabilities: ["周边品类建议", "画面与材质说明", "预售展示文案"],
    href: "/booth?mode=merch",
    action: "规划周边方案",
    accent: "#54c5b7"
  }
};

export function HomeDiscovery() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("OC");
  const [saved, setSaved] = useState<string[]>([]);
  const activeCategoryFeature = categoryFeatures[activeCategory] ?? categoryFeatures.OC;

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
    <div className="studio-shell overflow-hidden">
      <section className="relative isolate mx-auto max-w-[1440px] px-4 pb-10 pt-8 sm:px-6 lg:px-8 lg:pb-14">
        <div className="studio-particles" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>

        <div className="studio-hero grid gap-6 rounded-[34px] p-4 sm:p-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(480px,1.1fr)] lg:p-6">
          <div className="glass-panel relative z-10 flex min-h-[520px] flex-col justify-between overflow-hidden rounded-[30px] p-6 sm:p-8 lg:p-10">
            <div>
              <p className="oc-kicker mb-4 text-[11px] font-black text-primary">AI OC Studio</p>
              <h1 className="oc-title max-w-xl text-[clamp(2.6rem,6vw,5.2rem)] font-black leading-[1.02]">
                AI OC 创作工作台
              </h1>
              <p className="mt-5 max-w-xl text-base font-bold leading-7 text-ink/76 sm:text-lg">
                创建你的原创角色，管理设定、头像、周边与互动内容。
              </p>
              <p className="mt-3 max-w-lg text-sm font-semibold leading-6 text-muted">
                从灵感设定到角色资产，一站式完成你的 OC 世界。
              </p>

              <form
                className="mt-7 flex flex-col gap-3 rounded-[26px] border border-white/72 bg-white/54 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  window.location.href = `/create?idea=${encodeURIComponent(query || "银发星轨少女，温柔但擅长机关术")}`;
                }}
              >
                <label className="sr-only" htmlFor="home-search">
                  搜索创作模板或输入角色灵感
                </label>
                <div className="flex min-h-12 flex-1 items-center gap-3 rounded-pill bg-white/76 px-4 ring-1 ring-inset ring-white/86">
                  <Search size={18} className="text-primary" aria-hidden="true" />
                  <input
                    id="home-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="w-full bg-transparent text-sm font-bold text-ink outline-none placeholder:text-muted sm:text-base"
                    placeholder="输入灵感，例如：机械猫耳少女、温柔系"
                  />
                </div>
                <button type="submit" className="dream-btn-primary shrink-0">
                  开始创作
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              </form>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/create" className="dream-btn-secondary min-h-11 px-5">
                  浏览灵感
                  <Wand2 size={16} aria-hidden="true" />
                </Link>
                <Link href="/characters" className="dream-btn-secondary min-h-11 px-5">
                  角色资产
                  <FolderHeart size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3 text-ink">
              {[
                ["创作", "OC 人设"],
                ["资产", "设定沉淀"],
                ["商业", "商品与接单"]
              ].map(([label, value]) => (
                <div key={label} className="rounded-[22px] border border-white/60 bg-white/42 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                  <p className="text-xs font-black text-primary">{label}</p>
                  <p className="mt-2 text-sm font-black leading-tight sm:text-base">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[420px] overflow-hidden rounded-[30px] border border-white/72 bg-white/36 shadow-[0_30px_90px_rgba(72,48,118,0.16)] backdrop-blur-xl lg:min-h-[520px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.88),transparent_24rem),radial-gradient(circle_at_80%_16%,rgba(240,160,208,0.32),transparent_22rem),radial-gradient(circle_at_70%_84%,rgba(142,184,240,0.32),transparent_24rem)]" />
            <Image
              src="/images/site-overview.png"
              alt="AI OC Studio 角色创作平台界面与二次元角色素材展示"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 760px"
              className="object-contain p-3 sm:p-5 lg:p-7"
            />
            <div className="pointer-events-none absolute inset-0 rounded-[30px] ring-1 ring-inset ring-white/72" />
            <div className="absolute bottom-4 left-4 right-4 grid gap-3 sm:grid-cols-3">
              {[
                { title: "角色资产", text: "头像、立绘、设定" },
                { title: "逛商品", text: "模板、徽章、小卡" },
                { title: "角色互动", text: "剧情、关系、口癖" }
              ].map((item) => (
                <div key={item.title} className="rounded-[20px] border border-white/68 bg-white/72 p-3 shadow-[0_14px_34px_rgba(72,48,118,0.12)] backdrop-blur-xl">
                  <p className="text-xs font-black text-primary">{item.title}</p>
                  <p className="mt-1 text-xs font-bold text-muted">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="oc-title text-3xl font-black leading-tight md:text-4xl">从创作到交易的六个主入口</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-muted">
              首页第一屏保留完整平台感：AI 创作是入口，角色资产连接商品、接单和互动。
            </p>
          </div>
          <Link href="/create" className="dream-btn-secondary w-fit">
            进入工作台
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featureEntries.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.title}
                href={feature.href}
                className={cn(
                  "glass-panel glass-panel-hover group relative min-h-[190px] overflow-hidden p-5",
                  "bg-gradient-to-br",
                  feature.tone
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-12 place-items-center rounded-[18px] border border-white/70 bg-white/68 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                    <Icon size={21} aria-hidden="true" />
                  </span>
                  <span className="rounded-pill border border-white/70 bg-white/50 px-3 py-1 text-xs font-black text-muted">
                    AI OC
                  </span>
                </div>
                <h3 className="oc-title mt-6 text-2xl font-black">{feature.title}</h3>
                <p className="mt-3 max-w-sm text-sm font-semibold leading-6 text-muted">{feature.desc}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-primary">
                  {feature.action}
                  <ArrowRight size={16} className="transition group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <h2 className="oc-title text-3xl font-black leading-tight md:text-4xl">按创作目标探索</h2>
          <Link href="/create" className="dream-btn-secondary w-fit">
            全部分类
            <ArrowRight size={16} aria-hidden="true" />
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
                "flex min-h-16 min-w-[148px] snap-start items-center gap-3 rounded-pill border border-white/60 bg-white/36 px-2 text-left text-sm font-black shadow-[0_12px_30px_rgba(72,48,118,0.08)] backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/70",
                activeCategory === category && "border-[#f2dc9a] bg-white shadow-[0_18px_42px_rgba(156,124,244,0.16)]"
              )}
            >
              <span className="grid size-14 shrink-0 place-items-center rounded-pill bg-[radial-gradient(circle_at_30%_25%,#ffffff_0,#f5a6d1_28%,#9c7cf4_62%,#8eb8f0_100%)] text-sm font-black text-white shadow-[0_10px_24px_rgba(156,124,244,0.2)]">
                {category.slice(0, 2)}
              </span>
              <span className="leading-tight text-ink">{category}</span>
            </button>
          ))}
        </SwipeRail>

        <div
          className="glass-panel mt-6 grid gap-6 p-5 md:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.85fr)_auto] md:items-center md:p-6"
          aria-live="polite"
        >
          <div className="border-l-4 pl-5" style={{ borderColor: activeCategoryFeature.accent }}>
            <h3 className="oc-title text-2xl font-black md:text-3xl">{activeCategoryFeature.title}</h3>
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

          <Link href={activeCategoryFeature.href} className="dream-btn-primary w-fit">
            {activeCategoryFeature.action}
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionHeading
          title="角色卡示例"
          desc="横向浏览示例角色，像逛作品流一样快速感知生成结果。收藏按钮只做前端演示状态。"
          action={
            <Link href="/characters" className="dream-btn-secondary">
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
        <SectionHeading title="创作模板" desc="模板是后续工作流入口：角色卡、剧情、对话和头像提示词。" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {creationTemplates.map((template) => (
            <Link key={template.title} href="/create" className="clip-card glass-panel glass-panel-hover p-5">
              <span className="inline-flex rounded-pill px-3 py-1 text-xs font-black text-ink" style={{ backgroundColor: template.accent }}>
                {template.label}
              </span>
              <h3 className="oc-title mt-5 text-2xl font-black">{template.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted">{template.desc}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-primary">
                开始生成
                <Wand2 size={16} aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionHeading title="摊宣与周边方向" desc="面向 Coser、摊主和社团，把商品信息变成平台文案、菜单和价格牌。" />
        <SwipeRail>
          {boothTemplates.map((template, index) => (
            <Link key={template} href="/booth" className="glass-panel glass-panel-hover min-w-[240px] snap-start p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="grid size-12 place-items-center rounded-pill bg-lime text-sm font-black text-ink">{index + 1}</span>
                {index % 2 === 0 ? <BookOpenText size={20} className="text-primary" aria-hidden="true" /> : <Bot size={20} className="text-purple" aria-hidden="true" />}
              </div>
              <h3 className="oc-title text-xl font-black">{template}</h3>
              <p className="mt-3 text-sm leading-6 text-muted">点击进入工具页，输入商品信息后生成可复制结果。</p>
            </Link>
          ))}
        </SwipeRail>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionHeading
          title="逛商品"
          desc="用前端 mock 展示数字商品与轻量实体周边预览，愿望单和购物车只做演示状态。"
          action={
            <Link href="/market" className="dream-btn-secondary">
              进入逛商品
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          }
        />
        <SwipeRail>
          {marketProducts.map((product) => (
            <Link key={product.id} href="/market" className="glass-panel glass-panel-hover min-w-[260px] snap-start p-5">
              <div className="mb-5 flex items-start justify-between gap-3">
                <span className="grid size-12 place-items-center rounded-pill text-ink" style={{ backgroundColor: product.accent }}>
                  <ShoppingBag size={19} aria-hidden="true" />
                </span>
                <span className="rounded-pill bg-white/62 px-3 py-1 text-xs font-black text-muted">{product.kind}</span>
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
          title="找创作者"
          desc="从服务卡片开始浏览头像、摊宣和周边图案接单，创作者主页承载信任信息。"
          action={
            <Link href="/commissions" className="dream-btn-secondary">
              查看服务
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          }
        />
        <div className="grid gap-4 md:grid-cols-3">
          {creatorServices.map((service) => (
            <Link key={service.id} href="/commissions" className="glass-panel glass-panel-hover p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="grid size-12 place-items-center rounded-pill text-ink" style={{ backgroundColor: service.accent }}>
                  <Store size={19} aria-hidden="true" />
                </span>
                <span className="rounded-pill bg-white/62 px-3 py-1 text-xs font-black text-muted">{service.status}</span>
              </div>
              <h3 className="oc-title mt-5 text-xl font-black">{service.title}</h3>
              <p className="mt-2 text-sm font-bold text-muted">
                {service.creator} / {service.priceRange}
              </p>
              <p className="mt-3 text-sm leading-6 text-muted">{service.sample}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="glass-panel grid gap-5 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div>
            <h2 className="oc-title text-3xl font-black">从自己的角色资产开始互动会话</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">角色互动用于测试口癖、关系动态和场景对话，不做预置陪聊角色池。</p>
          </div>
          <Link href="/chat" className="dream-btn-primary">
            <MessageCircle size={17} aria-hidden="true" />
            进入角色互动
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-5 rounded-[32px] bg-[linear-gradient(135deg,#3a245e,#9c7cf4_52%,#a9cdfb)] p-6 text-white shadow-[0_28px_80px_rgba(72,48,118,0.22)] md:grid-cols-[1.4fr_0.6fr] md:p-8">
          <div>
            <h2 className="oc-title text-3xl font-black">先用免费版跑通角色，再按点数升级创作量。</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/82">当前页面只做前端展示，不接支付；商业结构保留免费版、会员、点数和单次项目。</p>
          </div>
          <div className="flex items-end">
            <Link href="/pricing" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-pill bg-white px-5 text-sm font-black text-[#3a245e] transition hover:-translate-y-1">
              查看定价
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
