"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, Bookmark, Clock3, Search, ShieldCheck, Sparkles, Star, UserRoundCheck, Wand2 } from "lucide-react";
import { loadDiscovery, type DiscoveryService, type DiscoveryCreator } from "@/lib/discovery";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const heroCards = [
  {
    title: "真人画师优先",
    desc: "从 OC 头像、立绘到 Live2D 拆分，把需求交给可验证创作者。",
    artist: "平台功能介绍",
    image: "/images/artwork/silver-twins.jpg",
    imagePosition: "center top"
  },
  {
    title: "反 AI 训练保护",
    desc: "约稿、作品展示和需求表单都强调原创授权与素材边界。",
    artist: "平台规则介绍",
    image: "/images/artwork/green-wedding.jpg",
    imagePosition: "center top"
  },
  {
    title: "委托流程与档期",
    desc: "报价、工期、修改次数和商用授权在下单前先讲清楚。",
    artist: "平台流程介绍",
    image: "/images/artwork/starlight-mage.png",
    imagePosition: "center top"
  }
];

const categories = [
  { name: "OC 头像", service: "OC 头像", icon: "头像", tone: "from-[#ff79bd] via-[#9b7cff] to-[#69e1ff]" },
  { name: "角色立绘", service: "角色立绘", icon: "立绘", tone: "from-[#ffb75d] via-[#ff6aa6] to-[#9b7cff]" },
  { name: "Live2D", service: "Live2D", icon: "2D", tone: "from-[#7c86ff] via-[#71e6d3] to-[#c8ff4d]" },
  { name: "表情徽章", service: "表情 / 徽章", icon: "表情", tone: "from-[#c8ff4d] via-[#70d8ff] to-[#a77cff]" },
  { name: "人设卡", service: "角色立绘", icon: "设定", tone: "from-[#ff7b7b] via-[#ffce5d] to-[#c8ff4d]" },
  { name: "摊宣周边", service: "摊宣 / 周边", icon: "周边", tone: "from-[#68e0b8] via-[#7a92ff] to-[#f37dd8]" },
  { name: "VTuber 套餐", service: "Live2D", icon: "V", tone: "from-[#8f73ff] via-[#f078c8] to-[#ffc85a]" },
  { name: "商稿授权", service: "角色立绘", license: "商业使用", icon: "授权", tone: "from-[#66d7ff] via-[#b7ff48] to-[#ffdc63]" }
];

const filters = ["全部", "开稿中", "7 天内", "Live2D", "OC", "头像", "摊宣"];

export function HomeDiscovery() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("全部");
  const [saved, setSaved] = useState<string[]>([]);
  const [services, setServices] = useState<DiscoveryService[]>([]);
  const [creators, setCreators] = useState<DiscoveryCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingFavorite, setSavingFavorite] = useState(false);
  const reload = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await loadDiscovery(); setServices(result.services); setCreators(result.creators);
      const client = createSupabaseBrowserClient();
      const { data, error: favoriteError } = await client.from("service_favorites").select("service_id");
      if (favoriteError) throw new Error("收藏暂时无法加载，请重试。");
      setSaved((data ?? []).map(row=>row.service_id));
    } catch(cause) { setError(cause instanceof Error ? cause.message : "加载失败，请重试。"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  async function toggleFavorite(serviceId: string) {
    if (savingFavorite) return;
    setSavingFavorite(true); setError("");
    try {
      const client = createSupabaseBrowserClient();
      const { data: { user } } = await client.auth.getUser();
      if (!user) throw new Error("请先登录再收藏服务。");
      const exists = saved.includes(serviceId);
      const { error: saveError } = exists
        ? await client.from("service_favorites").delete().eq("user_id",user.id).eq("service_id",serviceId)
        : await client.from("service_favorites").upsert({user_id:user.id,service_id:serviceId},{onConflict:"user_id,service_id",ignoreDuplicates:true});
      if (saveError) throw new Error("收藏更新失败，请重试。");
      setSaved(current=>exists?current.filter(id=>id!==serviceId):[...current,serviceId]);
    } catch(cause) { setError(cause instanceof Error ? cause.message : "收藏失败，请重试。"); }
    finally { setSavingFavorite(false); }
  }

  const filteredServices = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return services.filter((service) => {
      const text = [service.title, service.creator, ...service.tags].join(" ").toLowerCase();
      const matchQuery = !keyword || text.includes(keyword);
      const matchFilter =
        activeFilter === "全部" ||
        (activeFilter === "开稿中" && service.status === "OPEN") ||
        (activeFilter === "7 天内" && service.days <= 7) ||
        text.includes(activeFilter.toLowerCase());
      return matchQuery && matchFilter;
    });
  }, [activeFilter, query, services]);

  return (
    <div className="marketplace-background overflow-hidden bg-bg text-ink">
      <section className="mx-auto max-w-[1440px] px-4 pb-8 pt-6 sm:px-6 lg:px-8 lg:pb-12">
        <div className="min-w-0">
          <div className="min-w-0">
            <div className="mb-5 inline-flex items-center gap-2 rounded-pill border border-white/10 bg-white/8 px-3 py-2 text-xs font-black text-lime backdrop-blur">
              <Sparkles size={15} aria-hidden="true" />
              WEIMING · 原创角色共创与约稿平台
            </div>
            <h1 className="oc-title max-w-3xl text-[clamp(2rem,3.8vw,4.15rem)] font-black leading-[1.08]">
              为你的 OC 找到合适画师
            </h1>
            <p className="mt-4 max-w-xl text-sm font-bold leading-7 text-ink/68 sm:text-base">
              筛选风格、报价、档期与授权，快速匹配头像、立绘和 Live2D 服务。
            </p>

            <form
              className="mt-7 flex max-w-2xl flex-col gap-3 rounded-[28px] border border-white/70 bg-white/62 p-2 shadow-[0_24px_80px_rgba(40,45,80,0.16)] backdrop-blur-xl sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                document.getElementById("home-services")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              <label className="sr-only" htmlFor="home-search">
                搜索标签、分类、画师或服务
              </label>
              <div className="flex min-h-14 flex-1 items-center gap-3 rounded-pill bg-white/86 px-5">
                <Search size={21} className="text-ink/58" aria-hidden="true" />
                <input
                  id="home-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-full bg-transparent text-sm font-bold text-ink outline-none placeholder:text-ink/42"
                  placeholder="搜索 OC 头像、Live2D、表情包、摊宣"
                />
              </div>
              <button type="submit" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-pill bg-lime px-6 text-sm font-black text-ink transition hover:scale-[1.02]">
                开始找画师
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            </form>

            <div className="mt-6 flex flex-wrap gap-2">
              {["找画师", "发需求", "画师入驻", "原创保护"].map((item) => (
                <span key={item} className="rounded-pill border border-white/70 bg-white/68 px-4 py-2 text-xs font-black text-ink/72">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {heroCards.map((card) => (
              <Link
                key={card.title}
                href="/commissions"
                className="group relative min-h-[168px] overflow-hidden rounded-[30px] border border-white/40 bg-[#171722] text-white shadow-[0_24px_70px_rgba(30,45,90,0.22)] transition hover:-translate-y-1 md:min-h-[280px] lg:min-h-[288px]"
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-0 z-0 scale-100 bg-cover bg-no-repeat opacity-80 transition duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${card.image})`, backgroundPosition: card.imagePosition }}
                />
                <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#171722]/94 via-[#171722]/42 to-[#171722]/8" />
                <div className="absolute inset-x-0 bottom-0 z-20 p-5 lg:p-4 xl:p-5">
                  <h2 className="oc-title text-xl font-black leading-tight xl:text-2xl">{card.title}</h2>
                  <p className="mt-2 text-xs font-semibold leading-5 text-white/78">{card.desc}</p>
                  <span className="mt-4 inline-flex rounded-pill bg-white/14 px-3 py-1 text-xs font-black text-white/86 backdrop-blur">
                    {card.artist}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="oc-kicker text-[11px] font-black text-lime">380,000+ commission signals</p>
            <h2 className="oc-title mt-2 text-2xl font-black sm:text-3xl">热门约稿分类</h2>
          </div>
          <Link href="/commissions" className="hidden items-center gap-2 rounded-pill bg-white/12 px-5 py-3 text-sm font-black text-white/86 sm:inline-flex">
            全部分类
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {categories.map((category) => (
            <Link
              key={category.name}
              href={`/create?service=${encodeURIComponent(category.service)}${category.license ? `&license=${encodeURIComponent(category.license)}` : ""}`}
              aria-label={`发布${category.name}需求`}
              className={cn(
                "group relative min-h-[112px] overflow-hidden rounded-[22px] bg-gradient-to-br p-4 shadow-[0_18px_45px_rgba(0,0,0,0.25)] transition hover:-translate-y-1",
                category.tone
              )}
            >
              <div className="absolute -right-5 -top-5 grid size-20 place-items-center rounded-full bg-white/20 text-sm font-black text-white/72 transition group-hover:scale-110">
                {category.icon}
              </div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,255,255,0.35),transparent_22%),linear-gradient(135deg,rgba(255,255,255,0.16),transparent)]" />
              <span className="absolute bottom-4 left-4 right-4 text-sm font-black text-white drop-shadow">{category.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section id="home-services" className="mx-auto max-w-[1440px] scroll-mt-24 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="oc-kicker text-[11px] font-black text-lime">Marketplace</p>
            <h2 className="oc-title mt-2 text-2xl font-black sm:text-3xl">开稿中的服务</h2>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 rail-scroll">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  "min-h-10 shrink-0 rounded-pill px-4 text-sm font-black transition",
                  activeFilter === filter ? "bg-ink text-white" : "bg-white/72 text-ink/72 shadow-sm hover:bg-white"
                )}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {loading ? <p role="status" className="mb-4 text-muted">正在加载服务目录…</p> : error ? <p role="alert" className="mb-4 text-danger">{error} <button onClick={() => void reload()} className="underline">重试</button></p> : filteredServices.length === 0 ? <p className="mb-4 text-muted">暂无匹配服务，请更换搜索或筛选条件。</p> : null}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {filteredServices.map((service) => {
            const isSaved = saved.includes(service.id);
            return (
              <article
                key={service.id}
                className="group relative overflow-hidden rounded-[26px] bg-card text-white shadow-[0_16px_40px_rgba(35,50,95,0.14)]"
              >
                <Image
                  src={service.image}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, 360px"
                  className="object-cover transition duration-500 group-hover:scale-105"
                  style={{ objectPosition: service.imagePosition }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-[#171722]/10 to-[#171722]/78" />
                <div className="relative aspect-[1.62] overflow-hidden">
                  <span className="absolute left-3 top-3 rounded-pill bg-lime px-3 py-1 text-xs font-black text-ink">{service.status}</span>
                  {service.placeholder ? <span className="absolute bottom-3 left-3 rounded-pill bg-black/60 px-3 py-1 text-xs font-bold text-white">暂无作品封面</span> : null}
                  {service.sale ? <span className="absolute bottom-3 left-3 rounded-pill bg-purple px-3 py-1 text-xs font-black text-white">Sale</span> : null}
                  <button
                    type="button"
                    disabled={savingFavorite || loading}
                    onClick={() => void toggleFavorite(service.id)}
                    className="absolute right-3 top-3 grid size-11 place-items-center rounded-[18px] bg-white/88 text-ink backdrop-blur transition hover:bg-white"
                    aria-label={isSaved ? "取消收藏" : "收藏服务"}
                  >
                    <Bookmark size={18} fill={isSaved ? "currentColor" : "none"} aria-hidden="true" />
                  </button>
                </div>
                <div className="relative bg-gradient-to-b from-[#171722]/34 via-[#171722]/60 to-[#171722]/80 p-4 backdrop-blur-[1px]">
                  <div className="relative">
                    <h3 className="line-clamp-2 min-h-11 text-base font-black leading-tight"><Link href={`/commissions/${service.id}`}>{service.title}</Link></h3>
                    <div className="mt-3 flex items-center gap-2 text-[13px] font-bold text-white/62">
                      <span className="grid size-6 place-items-center rounded-full bg-gradient-to-br from-pink to-blue text-[10px] text-white">画</span>
                      <span className="truncate">{service.creator}</span>
                      <BadgeCheck size={16} className="shrink-0 text-blue" aria-hidden="true" />
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="text-sm font-black text-lime">{service.price}</span>
                      <span className="inline-flex items-center gap-1 text-[13px] font-black">
                        <Star size={15} fill="currentColor" className="text-white" aria-hidden="true" />
                        {service.rating} <span className="text-white/42">({service.reviews})</span>
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {service.tags.map((tag) => (
                        <span key={tag} className="rounded-pill bg-white/10 px-3 py-1 text-[11px] font-black text-white/66">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-4 px-4 py-8 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div className="rounded-[32px] border border-white/70 bg-white/72 p-6 shadow-[0_18px_52px_rgba(35,50,95,0.12)]">
          <p className="oc-kicker text-[11px] font-black text-lime">Trust layer</p>
          <h2 className="oc-title mt-2 text-2xl font-black sm:text-3xl">下单前先看清楚：档期、授权、规则和评价</h2>
          <p className="mt-3 text-[13px] font-semibold leading-6 text-muted sm:text-sm">
            借鉴 VGen 的信任信号，但更贴近中文约稿习惯：担保交易、定金尾款、商用授权、修改次数和 AI 素材边界都需要在服务页明确。
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              ["认证画师", UserRoundCheck],
              ["担保交易", ShieldCheck],
              ["按时率", Clock3],
              ["规则前置", BadgeCheck]
            ].map(([label, Icon]) => (
              <div key={label as string} className="flex items-center gap-3 rounded-[20px] bg-card p-4">
                <span className="grid size-10 place-items-center rounded-pill bg-lime text-ink">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <span className="font-black">{label as string}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          {creators.map((creator) => (
            <Link key={creator.handle} href={creator.href} className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-card p-5 transition hover:-translate-y-1 sm:flex-row sm:items-center">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-pink via-purple to-lime shadow-[0_18px_44px_rgba(0,0,0,0.26)]">
                <Image src={creator.image} alt="" fill sizes="80px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-black">{creator.name}</h3>

                </div>
                <p className="mt-1 text-sm font-bold text-muted">
                  {creator.handle} · {creator.role}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {creator.badges.map((badge) => (
                    <span key={badge} className="rounded-pill bg-white/8 px-3 py-1 text-xs font-black text-white/62">
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 text-sm font-black sm:block sm:text-right">
                <p>★ {creator.score}</p>
                <p className="text-muted">{creator.onTime}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 pb-12 pt-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[34px] bg-lime p-6 text-ink md:p-8">
          <div className="absolute -right-12 -top-20 size-56 rounded-full bg-white/35 blur-2xl" />
          <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="oc-kicker text-[11px] font-black text-ink/62">Creator side</p>
              <h2 className="oc-title mt-2 text-2xl font-black md:text-4xl">画师也需要一个能展示作品、服务和规则的主页</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/commissions" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-pill bg-ink px-6 text-sm font-black text-white">
                浏览服务
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link href="/create" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-pill bg-white px-6 text-sm font-black text-ink">
                发布需求
                <Wand2 size={17} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
