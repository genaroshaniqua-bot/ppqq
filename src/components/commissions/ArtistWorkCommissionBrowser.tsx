"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, Images, LockKeyhole } from "lucide-react";

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

const preferredCategories = ["全部", "头像", "立绘", "Live2D", "表情", "徽章", "海报", "周边", "设定"];

function normalizeCategory(item: CommissionArtwork) {
  const text = `${item.category} ${item.tags.join(" ")}`.toLowerCase();
  if (text.includes("live2d")) return "Live2D";
  for (const category of preferredCategories.slice(1)) {
    if (text.includes(category.toLowerCase())) return category;
  }
  return item.category || "其他";
}

export function ArtistWorkCommissionBrowser({ items }: { items: CommissionArtwork[] }) {
  const [category, setCategory] = useState("全部");
  const categorized = useMemo(() => items.map((item) => ({ ...item, normalizedCategory: normalizeCategory(item) })), [items]);
  const categories = useMemo(() => {
    const available = new Set(categorized.map((item) => item.normalizedCategory));
    const ordered = preferredCategories.filter((item) => item === "全部" || available.has(item));
    const remaining = [...available].filter((item) => !ordered.includes(item));
    return [...ordered, ...remaining];
  }, [categorized]);
  const visible = category === "全部" ? categorized : categorized.filter((item) => item.normalizedCategory === category);

  return (
    <section id="artist-work-browser" className="mt-10 scroll-mt-28" aria-labelledby="artist-work-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Browse by artwork</p>
          <h2 id="artist-work-heading" className="mt-1 font-display text-3xl font-black sm:text-4xl">根据作品找到画师</h2>
          <p className="mt-2 text-sm font-semibold text-muted">浏览公开作品或付费作品预览；价格、档期和套餐以画师主页为准。</p>
        </div>
        <span className="rounded-pill bg-white px-4 py-2 text-xs font-black text-muted shadow-soft">{visible.length} 件可约稿作品</span>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-2" aria-label="作品分类">
        {categories.map((item) => (
          <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)} className={`min-h-11 shrink-0 rounded-pill px-5 text-sm font-black transition ${category === item ? "bg-ink text-white" : "border border-line bg-white text-muted hover:border-primary hover:text-ink"}`}>
            {item}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visible.map((item) => (
          <article key={item.id} className="group overflow-hidden rounded-[24px] border border-line bg-white shadow-soft transition hover:-translate-y-0.5 hover:border-primary">
            <Link href={`/artists/${item.artistId}`} aria-label={`查看${item.artistName}的作品${item.title}和约稿服务`} className="block">
              <div className="relative aspect-[4/3] overflow-hidden bg-bg">
                <div role="img" aria-label={item.visibility === "paid" ? `${item.title}的付费预览` : item.title} className={`absolute inset-0 bg-cover bg-center transition duration-300 group-hover:scale-[1.02] ${item.visibility === "paid" ? "scale-105 blur-md" : ""}`} style={{ backgroundImage: `url(${item.imageUrl})` }} />
                {item.visibility === "paid" ? <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-pill bg-ink/82 px-3 py-1.5 text-[11px] font-black text-white backdrop-blur"><LockKeyhole size={12} aria-hidden="true" />{item.accessPrice} 点解锁完整作品</span> : null}
              </div>
              <div className="p-4">
                <p className="flex items-center gap-1 text-xs font-black text-purple"><BadgeCheck size={13} aria-hidden="true" />{item.artistName}</p>
                <h3 className="mt-1 line-clamp-1 font-display text-xl font-black">{item.title}</h3>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black text-muted">
                  <span className="rounded-pill bg-bg px-2.5 py-1">{item.normalizedCategory}</span>
                  <span className="rounded-pill bg-bg px-2.5 py-1">{item.serviceCount} 项服务</span>
                  <span className={`rounded-pill px-2.5 py-1 ${item.availability === "open" ? "bg-lime text-ink" : "bg-bg"}`}>{item.availability === "open" ? "开放约稿" : item.availability === "queue" ? "可排队" : "暂不接单"}</span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-line pt-3"><span className="text-sm font-black">¥{item.startingPrice} 起</span><span className="inline-flex items-center gap-1 text-xs font-black text-primary">查看画师服务<ArrowRight size={13} aria-hidden="true" /></span></div>
              </div>
            </Link>
          </article>
        ))}
      </div>

      {visible.length === 0 ? <div className="mt-4 rounded-[24px] border border-dashed border-line bg-white p-8 text-center"><Images className="mx-auto text-primary" /><p className="mt-3 font-display text-xl font-black">这个分类还没有可约稿作品</p><p className="mt-2 text-sm font-semibold text-muted">可以切换分类，或直接发布需求让画师响应。</p><Link href="/create" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-pill bg-ink px-4 text-xs font-black text-white">发起约稿<ArrowRight size={14} /></Link></div> : null}
    </section>
  );
}
