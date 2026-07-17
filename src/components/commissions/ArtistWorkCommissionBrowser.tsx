"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, Bookmark, LockKeyhole } from "lucide-react";

export type CommissionArtwork = {
  id: string;
  artistId: string;
  artistName: string;
  title: string;
  imageUrl: string;
  tags: string[];
  category: string;
  visibility: "public" | "paid";
  accessPrice: number;
  serviceCount: number;
  startingPrice: number;
  availability: string;
};

const categoryColors: Record<string, string> = {
  全部: "bg-[#a96ce8]",
  头像: "bg-[#df75bd]",
  立绘: "bg-[#7678df]",
  Live2D: "bg-[#58ad9f]",
  表情: "bg-[#d9659a]",
  徽章: "bg-[#638fc9]",
  海报: "bg-[#e09c61]",
  周边: "bg-[#74b968]",
  设定: "bg-[#b66fd4]",
  其他: "bg-[#7476bf]"
};

const preferredCategories = ["全部", "头像", "立绘", "Live2D", "表情", "徽章", "海报", "周边", "设定"];

function normalizeCategory(item: CommissionArtwork) {
  const text = `${item.category} ${item.tags.join(" ")}`.toLowerCase();
  if (text.includes("live2d")) return "Live2D";
  for (const category of preferredCategories.slice(1)) if (text.includes(category.toLowerCase())) return category;
  return item.category || "其他";
}

export function ArtistWorkCommissionBrowser({ items }: { items: CommissionArtwork[] }) {
  const [category, setCategory] = useState("全部");
  const categorized = useMemo(() => items.map((item) => ({ ...item, normalizedCategory: normalizeCategory(item) })), [items]);
  const categories = useMemo(() => {
    const available = new Set(categorized.map((item) => item.normalizedCategory));
    return preferredCategories.filter((item) => item === "全部" || available.has(item));
  }, [categorized]);
  const sections = useMemo(() => {
    const active = category === "全部" ? categories.filter((item) => item !== "全部") : [category];
    return active.map((name) => ({ name, items: categorized.filter((item) => item.normalizedCategory === name) })).filter((section) => section.items.length > 0);
  }, [categorized, categories, category]);

  return (
    <section id="artist-work-browser" className="mt-10" aria-labelledby="artist-work-heading">
      <h2 id="artist-work-heading" className="sr-only">根据作品找到画师</h2>

      <div className="rail-scroll flex gap-2 overflow-x-auto pb-3" aria-label="作品分类">
        {categories.map((item) => (
          <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)} className={`min-h-12 shrink-0 rounded-[16px] px-5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 ${categoryColors[item] ?? categoryColors.其他} ${category === item ? "ring-2 ring-white ring-offset-2 ring-offset-[#1d1d29]" : "opacity-82 hover:opacity-100"}`}>
            {item}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-7">
        {sections.map((section) => (
          <section key={section.name} aria-labelledby={`category-${section.name}`} className="grid gap-3 lg:grid-cols-[170px_minmax(0,1fr)]">
            <aside className={`flex min-h-[255px] flex-col justify-end rounded-[24px] p-5 text-white ${categoryColors[section.name] ?? categoryColors.其他}`}>
              <p className="text-xs font-black text-white/65">作品分类</p>
              <h3 id={`category-${section.name}`} className="mt-1 font-display text-3xl font-black">{section.name}</h3>
              <button type="button" onClick={() => setCategory(section.name)} className="mt-5 inline-flex min-h-10 w-fit items-center gap-2 rounded-pill bg-white px-4 text-xs font-black text-ink">查看全部<ArrowRight size={14} aria-hidden="true" /></button>
            </aside>

            <div className="rail-scroll flex gap-3 overflow-x-auto pb-3">
              {section.items.map((item) => {
                const curated = item.availability === "inspiration";
                const href = curated ? `/create?service=${encodeURIComponent(item.normalizedCategory)}` : `/artists/${item.artistId}`;
                return (
                  <article key={item.id} className="group w-[210px] shrink-0">
                    <Link href={href} aria-label={curated ? `以${item.title}为灵感发起约稿` : `查看${item.artistName}的${item.title}和约稿服务`} className="block">
                      <div className="relative aspect-square overflow-hidden rounded-[20px] bg-white/8">
                        <div role="img" aria-label={item.visibility === "paid" ? `${item.title}的付费预览` : item.title} className={`absolute inset-0 bg-cover bg-center transition duration-300 group-hover:scale-[1.025] ${item.visibility === "paid" ? "scale-105 blur-md" : ""}`} style={{ backgroundImage: `url(${item.imageUrl})` }} />
                        {item.visibility === "paid" ? <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-pill bg-[#d52d83] px-2.5 py-1 text-[11px] font-black text-white"><LockKeyhole size={11} aria-hidden="true" />{item.accessPrice} 点解锁</span> : curated ? <span className="absolute left-2.5 top-2.5 rounded-pill bg-[#a96ce8] px-2.5 py-1 text-[11px] font-black text-white">灵感示例</span> : null}
                        <span className="absolute right-2.5 top-2.5 grid size-9 place-items-center rounded-full bg-white/90 text-ink"><Bookmark size={15} aria-hidden="true" /></span>
                      </div>
                      <div className="px-1 pb-1 pt-3">
                        <p className="flex items-center gap-1 text-xs font-black text-white/62">{!curated ? <BadgeCheck size={13} className="text-[#8e82ff]" aria-hidden="true" /> : null}{item.artistName}</p>
                        <h4 className="mt-1 line-clamp-1 text-sm font-black text-white">{item.title}</h4>
                        <div className="mt-2 flex items-baseline gap-2"><span className="text-base font-black text-white">{curated ? "发布相似需求" : `¥${item.startingPrice} 起`}</span>{!curated ? <span className="text-[11px] font-bold text-white/38">{item.serviceCount} 项服务</span> : null}</div>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
