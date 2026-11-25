"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowDownToLine, ArrowUpRight, Search, SlidersHorizontal, X } from "lucide-react";
import { filterMaterials, materialCategories, materials } from "@/lib/materials";
import { MaterialImage } from "./MaterialImage";
import { cn } from "@/lib/utils";

const popularTags = ["二次元", "和风", "可爱", "动物", "透明背景", "手绘", "夜景", "花鸟", "山水", "雪景", "爱心", "几何", "无缝平铺"];

export function MaterialLibrary() {
  const search = useSearchParams();
  const query = search.get("q") ?? "";
  const category = search.get("category") ?? "";
  const tag = search.get("tag") ?? "";
  const [limit, setLimit] = useState(24);
  const results = filterMaterials(query, category, tag);

  function update(key: string, value: string) {
    const params = new URLSearchParams(search.toString());
    if (value) params.set(key, value); else params.delete(key);
    window.history.replaceState(null, "", `/materials${params.size ? `?${params}` : ""}`);
    setLimit(24);
  }
  function clear() {
    window.history.replaceState(null, "", "/materials");
    setLimit(24);
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[32px] border border-line bg-white p-6 sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full bg-primary/10" />
        <p className="relative text-xs font-black tracking-[0.2em] text-purple">WEIMING / CREATIVE COMMONS</p>
        <div className="relative mt-4 flex flex-wrap items-end justify-between gap-5">
          <div><h1 className="text-3xl font-black sm:text-5xl">给灵感，找一块拼图。</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-ink/75">{materials.length} 份精选开放素材，从角色头像到和风海报底图。按风格与用途检索，下载后继续你的创作。</p></div>
          <span className="rounded-pill bg-bg px-5 py-3 text-sm font-bold">首批 {materials.length} 份 · CC0</span>
        </div>
        <div className="relative mt-7 flex max-w-3xl items-center gap-3 rounded-pill border border-line bg-bg px-5 focus-within:ring-2 focus-within:ring-purple">
          <Search size={20} aria-hidden="true" className="shrink-0" />
          <label htmlFor="material-search" className="sr-only">搜索素材名称、作者或标签</label>
          <input id="material-search" type="search" value={query} onChange={(event) => update("q", event.target.value)} placeholder="试试「二次元」「兔子」「夜景」或「花鸟」" className="min-h-14 min-w-0 flex-1 bg-transparent text-base outline-none" />
        </div>
        <p className="relative mt-4 text-xs leading-6 text-ink/70">本批均按来源标注的 CC0 收录，可复制、改编与商用，无需强制署名；作者与原始来源仍完整保留。海报类为底图，不含活动文案。</p>
      </section>

      <section aria-label="素材筛选" className="py-7">
        <div className="flex flex-wrap gap-2">
          {["", ...materialCategories].map((value) => <button key={value} type="button" aria-pressed={category === value} onClick={() => update("category", value)} className={cn("min-h-11 rounded-pill border px-4 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple", category === value ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-purple")}>
            {value || "全部素材"}<span className="ml-2 opacity-70">{value ? materials.filter((item) => item.category === value).length : materials.length}</span>
          </button>)}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="mr-1 inline-flex items-center gap-1 text-xs font-semibold text-ink/70"><SlidersHorizontal size={14} aria-hidden="true" />风格标签</span>
          {popularTags.map((value) => <button type="button" key={value} aria-pressed={tag === value} onClick={() => update("tag", tag === value ? "" : value)} className={cn("min-h-11 rounded-pill px-3 text-xs font-semibold transition hover:bg-primary/15 focus-visible:outline-purple", tag === value ? "bg-purple text-white" : "bg-white text-ink/80")}>#{value}</button>)}
        </div>
      </section>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 aria-live="polite" className="text-lg font-black">{category || "全部素材"} <span className="ml-2 text-sm font-normal text-ink/70">找到 {results.length} 份</span></h2>
        {(query || category || tag) && <button onClick={clear} className="inline-flex min-h-11 items-center gap-1 rounded-pill px-3 text-sm font-semibold hover:bg-white"><X size={15} aria-hidden="true" />清空筛选</button>}
      </div>
      {results.length ? <>
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {results.slice(0, limit).map((item) => <article key={item.id} className="overflow-hidden rounded-card border border-line bg-white transition hover:border-purple/60">
            <Link href={`/materials/${item.id}`} className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple">
              <div className="relative aspect-[4/3] bg-bg"><MaterialImage src={item.preview} title={item.title} dark={item.category === "装饰纹样"} small={item.category === "表情贴纸"} /><span className="absolute bottom-2 left-2 rounded-pill border border-white/80 bg-white/90 px-2 py-1 text-[11px] font-semibold">{item.category}</span></div>
              <div className="p-3 pb-0 sm:p-4 sm:pb-0"><h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 group-hover:text-purple">{item.title}</h3><p className="mt-2 truncate text-xs text-ink/70">{item.author}</p></div>
            </Link>
            <div className="p-3 pt-2 sm:p-4 sm:pt-2">
              <div className="mb-3 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-ink/70">{item.tags.slice(0, 3).map((value) => <span key={value}>#{value}</span>)}</div>
              <div className="flex flex-wrap items-center justify-between gap-1 border-t border-line pt-2"><Link href={`/materials/${item.id}`} className="inline-flex min-h-11 items-center gap-1 text-xs font-bold hover:text-purple">预览与授权<ArrowUpRight size={14} aria-hidden="true" /></Link><a href={item.file} download={`${item.id}.webp`} aria-label={`下载 ${item.title}`} className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-bg hover:bg-primary/20"><ArrowDownToLine size={17} aria-hidden="true" /></a></div>
            </div>
          </article>)}
        </div>
        {limit < results.length && <div className="mt-8 text-center"><button onClick={() => setLimit((value) => value + 24)} className="min-h-12 rounded-pill border border-line bg-white px-8 font-bold hover:border-purple">加载更多（已显示 {Math.min(limit, results.length)} / {results.length}）</button></div>}
      </> : <div className="rounded-card border border-dashed border-line bg-white px-5 py-16 text-center"><h3 className="text-lg font-bold">暂时没有匹配的素材</h3><p className="mt-3 text-sm text-ink/70">试试更短的关键词，或清空分类与标签。</p><button onClick={clear} className="mt-5 min-h-11 rounded-pill bg-ink px-6 font-bold text-white">查看全部素材</button></div>}
      <aside className="mt-10 rounded-card border border-line bg-white p-5 text-xs leading-6 text-ink/75">素材按作者或馆藏公开授权收录，非本站独家作品；CC0 不表示作者或馆方为你的项目背书，也不授予商标等其他权利。发现来源或权利问题，可通过<Link href="/support" className="underline">客服中心</Link>反馈素材编号。<a href="/images/materials/credits.txt" download className="ml-2 font-bold underline">下载本批来源清单</a></aside>
    </div>
  );
}
