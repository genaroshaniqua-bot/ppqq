"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Eye, Images, LoaderCircle, LockKeyhole, Search, Sparkles, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { signPortfolioImage } from "@/lib/portfolio-media";

export type LobbyItem = {
  id: string; artist_id: string; artist_name: string; artist_avatar: string | null;
  title: string; image_url: string; tags: string[]; category: string;
  visibility: "public" | "paid"; access_price: number; created_at: string; source?: "portfolio" | "curated";
  media_reference?: string;
  creation_kind?: "ai" | "human";
  width?: number; height?: number;
  facets?: {
    techniques: string[]; traits: string[]; tones: string[];
    origin: { kind: "original" | "game" | "anime" | "other" | "unknown"; name: string; characters: string[]; evidence_url: string; note: string };
  };
  attribution?: {
    creator: string; source_url: string; license: string; license_url: string;
    changes: string; creation_evidence: string;
  };
};

const categoryOrder = ["全部", "头像", "立绘", "插画", "海报", "角色设定", "Live2D", "表情徽章", "Q版", "场景", "漫画", "服装设计", "周边设计", "像素画", "3D模型", "其他"];
const creationOptions = [
  { value: "all", label: "全部" }, { value: "ai", label: "AI 生成" },
  { value: "human", label: "非 AI 创作" }, { value: "unknown", label: "未标注" }
] as const;
const creationLabel = (item: LobbyItem) => item.creation_kind === "ai" ? "AI 生成" : item.creation_kind === "human" ? "非 AI 创作" : "创作方式未标注";

export function LobbyGallery({ items }: { items: LobbyItem[] }) {
  const [category, setCategory] = useState("全部");
  const [access, setAccess] = useState<"all" | "public" | "paid">("all");
  const [query, setQuery] = useState("");
  const [creation, setCreation] = useState<(typeof creationOptions)[number]["value"]>("all");
  const [technique, setTechnique] = useState("");
  const [trait, setTrait] = useState("");
  const [tone, setTone] = useState("");
  const [origin, setOrigin] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [loadingId, setLoadingId] = useState("");
  const [message, setMessage] = useState("");
  const [selectedItem, setSelectedItem] = useState<LobbyItem | null>(null);
  const [pendingUnlock, setPendingUnlock] = useState<LobbyItem | null>(null);
  const [unlockedImages, setUnlockedImages] = useState<Record<string, string>>({});

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: rows } = await supabase.from("portfolio_unlocks").select("portfolio_id").eq("viewer_id", data.user.id);
      setUnlocked((rows ?? []).map((row) => row.portfolio_id));
    });
  }, []);

  useEffect(() => {
    if (!selectedItem) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedItem(null);
      if (event.key !== "Tab") return;
      const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button, a[href], [tabindex="0"]');
      if (!controls?.length) return;
      const first = controls[0]; const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [selectedItem]);

  const categories = categoryOrder;
  const facetOptions = useMemo(() => {
    const unique = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b, "zh-CN"));
    return {
      techniques: unique(items.flatMap((item) => item.facets?.techniques ?? [])),
      traits: unique(items.flatMap((item) => item.facets?.traits ?? [])),
      tones: unique(items.flatMap((item) => item.facets?.tones ?? [])),
      origins: unique(items.flatMap((item) => item.facets ? [item.facets.origin.name] : []))
    };
  }, [items]);
  const facetControls = [
    { label: "绘画技法 / 效果", value: technique, set: setTechnique, options: facetOptions.techniques },
    { label: "人物特征", value: trait, set: setTrait, options: facetOptions.traits },
    { label: "整体色调", value: tone, set: setTone, options: facetOptions.tones },
    { label: "角色来源", value: origin, set: setOrigin, options: facetOptions.origins }
  ];
  const hasFilters = Boolean(query || technique || trait || tone || origin || category !== "全部" || access !== "all" || creation !== "all");
  function clearFilters() {
    setCategory("全部"); setAccess("all"); setCreation("all"); setQuery("");
    setTechnique(""); setTrait(""); setTone(""); setOrigin("");
  }
  const filtered = useMemo(() => {
    const terms = query.normalize("NFKC").trim().toLowerCase().split(/\s+/).filter(Boolean);
    return items.filter((item) => {
      if (category !== "全部" && item.category !== category) return false;
      if (access !== "all" && item.visibility !== access) return false;
      if (creation !== "all" && (item.creation_kind ?? "unknown") !== creation) return false;
      if (technique && !item.facets?.techniques.includes(technique)) return false;
      if (trait && !item.facets?.traits.includes(trait)) return false;
      if (tone && !item.facets?.tones.includes(tone)) return false;
      if (origin && item.facets?.origin.name !== origin) return false;
      if (!terms.length) return true;
      const haystack = [item.title, item.artist_name, item.category, creationLabel(item), item.attribution?.creator ?? "", ...item.tags, ...(item.facets?.techniques ?? []), ...(item.facets?.traits ?? []), ...(item.facets?.tones ?? []), item.facets?.origin.name ?? "", ...(item.facets?.origin.characters ?? [])].join(" ").normalize("NFKC").toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [access, category, creation, items, query, technique, trait, tone, origin]);

  const artists = useMemo(() => {
    const counts = new Map<string, { id: string; name: string; avatar: string | null; count: number }>();
    items.filter((item) => item.artist_id).forEach((item) => {
      const current = counts.get(item.artist_id);
      counts.set(item.artist_id, { id: item.artist_id, name: item.artist_name, avatar: item.artist_avatar, count: (current?.count ?? 0) + 1 });
    });
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 6);
  }, [items]);

  async function unlock(item: LobbyItem) {
    setPendingUnlock(null);
    setLoadingId(item.id); setMessage("");
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = `/login?next=${encodeURIComponent("/lobby")}`; return; }
    const { error } = await supabase.rpc("unlock_portfolio", { target_portfolio_id: item.id });
    setLoadingId("");
    if (error) { setMessage(error.message.includes("insufficient") ? "点数不足，请先前往定价页面充值。" : error.message); return; }
    const signedImage = await signPortfolioImage(supabase, item.media_reference ?? "");
    if (signedImage) setUnlockedImages((current) => ({ ...current, [item.id]: signedImage }));
    setUnlocked((current) => [...new Set([...current, item.id])]);
    setMessage(`已解锁《${item.title}》，现在可以查看完整作品。`);
  }

  return <>
    <section className="w-full min-w-0 overflow-hidden rounded-[28px] bg-ink text-white shadow-soft sm:rounded-[38px]">
      <div className="grid lg:grid-cols-[1.15fr_.85fr]">
        <div className="min-w-0 p-5 sm:p-9 lg:p-12"><span className="inline-flex min-h-10 items-center gap-2 rounded-pill bg-lime px-4 text-xs font-black text-ink"><Sparkles size={15} />WEIMING 作品大厅</span><h1 className="mt-6 max-w-3xl font-display text-4xl font-black leading-[1.02] sm:mt-7 sm:text-7xl sm:leading-[0.95]">沿着作品，<br /><span className="text-lime">遇见创作者。</span></h1><p className="mt-4 max-w-xl text-sm font-semibold leading-6 text-white/62 sm:mt-5 sm:leading-7">按绘画技法、人物特征、色调与角色来源，发现喜欢的二次元作品。</p><div className="mt-6 flex flex-wrap gap-2 sm:mt-8 sm:gap-3"><span className="rounded-pill border border-white/12 px-3 py-2 text-xs font-black sm:px-4">{items.length} 件作品</span><span className="rounded-pill border border-white/12 px-3 py-2 text-xs font-black sm:px-4">{artists.length} 位活跃画师</span><Link href="/commissions" className="inline-flex min-h-10 items-center gap-2 rounded-pill bg-white px-4 text-xs font-black text-ink">去约稿 <ArrowUpRight size={14} /></Link></div></div>
        <div className="relative hidden min-h-[420px] overflow-hidden border-l border-white/8 lg:block"><div className="absolute inset-0 grid grid-cols-2 gap-3 p-5 rotate-[-3deg] scale-110">{items.slice(0, 4).map((item, index) => <div key={item.id} className={`overflow-hidden rounded-[24px] bg-white/8 ${index % 2 ? "translate-y-8" : "-translate-y-5"}`}><img src={item.image_url} alt="" className="h-full w-full object-cover opacity-78" /></div>)}</div><div className="absolute inset-0 bg-gradient-to-r from-ink via-transparent to-transparent" /></div>
      </div>
    </section>

    {artists.length ? <section className="mt-6 rounded-[28px] border border-line bg-white p-5 shadow-soft"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.16em] text-purple">Artists in focus</p><h2 className="mt-1 font-display text-2xl font-black">从画师开始逛</h2></div><UserRound className="text-purple" /></div><div className="mt-4 flex gap-3 overflow-x-auto pb-1">{artists.map((artist) => <Link key={artist.id} href={`/artists/${artist.id}`} className="flex min-w-48 items-center gap-3 rounded-[18px] bg-bg p-3 transition hover:-translate-y-0.5 hover:bg-primary/10"><span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-purple text-sm font-black text-white">{artist.avatar ? <img src={artist.avatar} alt="" className="h-full w-full object-cover" /> : artist.name.slice(0, 1)}</span><span><strong className="block text-sm">{artist.name}</strong><small className="font-semibold text-muted">{artist.count} 件作品 · 查看主页</small></span></Link>)}</div></section> : null}

    <section aria-label="作品筛选" className="relative z-20 mt-6 lg:sticky lg:top-20 rounded-[26px] border border-white/70 bg-white/95 p-4 shadow-soft backdrop-blur-xl">
      <div className="flex items-center gap-2 overflow-x-auto pb-1" role="group" aria-label="创作方式">
        {creationOptions.map((option) => <button key={option.value} type="button" aria-pressed={creation === option.value} onClick={() => setCreation(option.value)} className={`min-h-11 shrink-0 rounded-pill px-3 text-xs font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple ${creation === option.value ? "bg-purple text-white" : "bg-bg text-muted hover:text-ink"}`}>{option.label}<span className="ml-2 text-xs opacity-75">{option.value === "all" ? items.length : items.filter((item) => (item.creation_kind ?? "unknown") === option.value).length}</span></button>)}
      </div>
      <div className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3 xl:flex xl:items-center">
        <label className="flex min-h-12 min-w-0 items-center gap-3 rounded-pill border border-line bg-bg px-4 focus-within:ring-2 focus-within:ring-purple xl:w-64 xl:shrink-0"><Search size={18} className="shrink-0 text-muted" /><input aria-label="搜索作品、作者或标签" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索作品、作者或标签" className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none" /></label>
        <div className="order-3 col-span-2 flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 xl:order-none" role="group" aria-label="作品类型">{categories.map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)} className={`min-h-11 shrink-0 rounded-pill px-4 text-xs font-black transition ${category === item ? "bg-ink text-white" : "bg-bg text-muted hover:text-ink"}`}>{item}</button>)}</div>
        <select aria-label="作品访问权限" value={access} onChange={(event) => setAccess(event.target.value as typeof access)} className="min-h-11 shrink-0 rounded-pill border border-line bg-white px-4 text-xs font-black"><option value="all">全部权限</option><option value="public">公开作品</option><option value="paid">付费作品</option></select>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {facetControls.map((control) => <label key={control.label} className="min-w-0 text-xs font-bold text-muted">
          <span className="mb-1.5 block">{control.label}</span>
          <select aria-label={control.label} value={control.value} onChange={(event) => control.set(event.target.value)} className="min-h-11 w-full min-w-0 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple">
            <option value="">全部</option>{control.options.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>)}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p role="status" aria-live="polite" className="text-xs font-semibold text-muted">找到 {filtered.length} 件作品 · 多项筛选同时生效</p>
        {hasFilters ? <button type="button" onClick={clearFilters} className="min-h-11 rounded-pill px-3 text-xs font-black text-purple hover:bg-purple/10">清除全部筛选</button> : null}
      </div>
      {facetControls.some((control) => control.value) ? <div className="mt-1 flex flex-wrap gap-2" aria-label="已选分类">{facetControls.filter((control) => control.value).map((control) => <button key={control.label} type="button" onClick={() => control.set("")} aria-label={`移除${control.label}：${control.value}`} className="inline-flex min-h-10 items-center gap-2 rounded-pill bg-purple/10 px-3 text-xs font-bold text-purple">{control.value}<X size={13} aria-hidden="true" /></button>)}</div> : null}
    </section>

    {message ? <p role="status" className="mt-5 rounded-[18px] bg-ink px-5 py-3 text-center text-sm font-black text-white">{message}</p> : null}
    <div className="mt-6 columns-1 gap-5 sm:columns-2 lg:columns-3 xl:columns-4">{filtered.map((item) => {
      const canView = item.visibility === "public" || unlocked.includes(item.id);
      const displayImage = unlockedImages[item.id] ?? item.image_url;
      return <article data-creation={item.creation_kind ?? "unknown"} data-work-id={item.id} key={item.id} className="group mb-5 break-inside-avoid overflow-hidden rounded-[26px] border border-line bg-white shadow-soft transition hover:-translate-y-1 hover:border-purple/35"><div className="relative overflow-hidden bg-bg"><button type="button" onClick={() => canView && setSelectedItem({ ...item, image_url: displayImage })} disabled={!canView} aria-label={canView ? `打开作品：${item.title}` : undefined} className="block w-full cursor-zoom-in disabled:cursor-default"><img width={item.width} height={item.height} loading="lazy" decoding="async" src={displayImage} alt={canView ? item.title : "付费作品预览"} className={`h-auto w-full transition duration-500 group-hover:scale-[1.02] ${canView ? "" : "scale-110 blur-2xl"}`} /></button>{!canView ? <div className="absolute inset-0 grid min-h-60 place-items-center bg-ink/44 p-6 text-center text-white"><div><LockKeyhole className="mx-auto" /><p className="mt-3 text-sm font-black">{item.access_price} 点解锁</p><Button type="button" disabled onClick={() => setPendingUnlock(item)} className="mt-3 bg-lime text-ink">{loadingId === item.id ? <LoaderCircle size={15} className="animate-spin" /> : <Eye size={15} />}付费解锁暂未开放</Button></div></div> : <span className="absolute left-3 top-3 rounded-pill bg-white/90 px-3 py-1.5 text-[11px] font-black text-ink shadow-soft">{item.category}</span>}<span className={`pointer-events-none absolute right-3 top-3 rounded-pill px-3 py-1.5 text-xs font-black shadow-soft ${item.creation_kind === "ai" ? "bg-ink text-white" : item.creation_kind === "human" ? "bg-white/95 text-purple" : "bg-white/95 text-muted"}`}>{creationLabel(item)}</span></div><div className="p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-xl font-black">{item.title}</h2>{item.artist_id ? <Link href={`/artists/${item.artist_id}`} className="mt-1 inline-flex items-center gap-1 text-xs font-black text-purple">{item.artist_name}<ArrowUpRight size={12} /></Link> : <p className="mt-1 text-xs font-black text-purple">{item.artist_name}</p>}</div>{item.visibility === "paid" ? <LockKeyhole size={15} className="mt-1 shrink-0 text-purple" /> : <Eye size={15} className="mt-1 shrink-0 text-primary" />}</div><div className="mt-3 flex flex-wrap gap-1.5">{item.tags.slice(0, 5).map((tag) => <button key={tag} type="button" onClick={() => setQuery(tag)} className="rounded-pill bg-bg px-2.5 py-1 text-[11px] font-bold text-muted hover:text-ink">#{tag}</button>)}</div></div></article>;
    })}</div>
    {!filtered.length ? <div className="mt-6 grid min-h-52 place-items-center rounded-[28px] border border-dashed border-line bg-white text-center"><div><Images className="mx-auto text-purple" /><p className="mt-3 font-display text-xl font-black">没有匹配的作品</p><p className="mt-2 text-sm text-muted">试试减少一个分类，或用空格组合特征，如“银发 蓝眼”。</p><button type="button" onClick={clearFilters} className="mt-2 text-sm font-black text-purple">清除筛选</button></div></div> : null}
    {selectedItem ? <div role="dialog" aria-modal="true" aria-labelledby="lobby-artwork-title" ref={dialogRef} className="fixed inset-0 z-[80] grid place-items-center bg-ink/88 p-3 backdrop-blur-md sm:p-6" onClick={() => setSelectedItem(null)}>
      <div className="relative max-h-[92dvh] w-full max-w-5xl overflow-y-auto rounded-[24px] bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={() => setSelectedItem(null)} aria-label="关闭大图" className="sticky left-full top-3 z-10 mr-3 grid size-11 shrink-0 place-items-center rounded-full bg-white text-ink shadow-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple"><X size={20} /></button>
        <img width={selectedItem.width} height={selectedItem.height} src={selectedItem.image_url} alt={selectedItem.title} className="mx-auto -mt-11 max-h-[62dvh] w-auto max-w-full object-contain" />
        <div className="p-5 sm:p-6"><div className="flex flex-wrap items-center gap-2"><span className="rounded-pill bg-purple/10 px-3 py-1 text-xs font-black text-purple">{creationLabel(selectedItem)}</span><span className="text-xs font-bold text-muted">{selectedItem.category}</span></div><h2 id="lobby-artwork-title" className="mt-3 font-display text-2xl font-black">{selectedItem.title}</h2><p className="mt-1 text-sm font-semibold text-muted">{selectedItem.artist_name}</p>
          {selectedItem.facets ? <div className="mt-4 rounded-[18px] border border-line p-4">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {[["绘画技法 / 效果", selectedItem.facets.techniques.join(" · ")], ["人物特征", selectedItem.facets.traits.join(" · ")], ["整体色调", selectedItem.facets.tones.join(" · ")], ["角色来源", selectedItem.facets.origin.name]].map(([label, value]) => <div key={label}><dt className="text-xs font-bold text-muted">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}
            </dl>
            {selectedItem.facets.origin.characters.length ? <p className="mt-3 text-sm"><strong>角色：</strong>{selectedItem.facets.origin.characters.join("、")}</p> : null}
            <p className="mt-3 text-xs leading-5 text-muted">{selectedItem.facets.origin.note}</p>
            <p className="mt-1 text-xs leading-5 text-muted">技法标签描述画面效果；AI / 非 AI 标记依据来源记录。</p>
          </div> : null}
          {selectedItem.attribution ? <div className="mt-4 space-y-2 rounded-[18px] bg-bg p-4 text-sm leading-6">
            <p><strong>来源署名：</strong>{selectedItem.attribution.creator} · 外部精选展示</p>
            <p className="flex flex-wrap gap-x-4 gap-y-1"><a href={selectedItem.attribution.source_url} target="_blank" rel="noopener noreferrer" className="font-bold text-purple underline underline-offset-4">查看原作与来源 ↗</a><a href={selectedItem.attribution.license_url} target="_blank" rel="noopener noreferrer" className="font-bold text-purple underline underline-offset-4">{selectedItem.attribution.license} 授权条款 ↗</a></p>
            <p className="text-xs text-muted">{selectedItem.attribution.changes}</p>
            <p className="text-xs text-muted">{selectedItem.attribution.creation_evidence}</p>
            <p className="text-xs text-muted">转载精选不代表作者入驻或推荐本平台。再次使用请遵守原作许可。</p>
          </div> : <p className="mt-4 text-sm text-muted">暂未提供可核实的创作方式及转载授权信息，请联系作者确认使用范围。</p>}
        </div>
      </div>
    </div> : null}
    {pendingUnlock ? <div role="dialog" aria-modal="true" aria-label="确认积分解锁" className="fixed inset-0 z-[90] grid place-items-center bg-ink/72 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-[28px] bg-white p-6 text-ink shadow-2xl"><span className="grid size-12 place-items-center rounded-full bg-purple/10 text-purple"><LockKeyhole size={21} /></span><h2 className="mt-5 font-display text-2xl font-black">确认解锁这件作品？</h2><p className="mt-3 text-sm font-semibold leading-6 text-muted">解锁《{pendingUnlock.title}》将从账户扣除 <strong className="text-ink">{pendingUnlock.access_price} 点</strong>，解锁后可持续查看。</p><div className="mt-6 grid grid-cols-2 gap-3"><Button type="button" variant="secondary" onClick={() => setPendingUnlock(null)}>取消</Button><Button type="button" disabled={loadingId === pendingUnlock.id} onClick={() => unlock(pendingUnlock)}>{loadingId === pendingUnlock.id ? <LoaderCircle size={15} className="animate-spin" /> : <LockKeyhole size={15} />}确认解锁</Button></div></div></div> : null}
  </>;
}
