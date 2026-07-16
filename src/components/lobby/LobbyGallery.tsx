"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Eye, Images, LoaderCircle, LockKeyhole, Search, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type LobbyItem = {
  id: string; artist_id: string; artist_name: string; artist_avatar: string | null;
  title: string; image_url: string; tags: string[]; category: string;
  visibility: "public" | "paid"; access_price: number; created_at: string;
};

const categoryOrder = ["全部", "头像", "立绘", "海报", "插画", "Live2D", "表情徽章", "角色设定", "周边设计", "其他"];

export function LobbyGallery({ items }: { items: LobbyItem[] }) {
  const [category, setCategory] = useState("全部");
  const [access, setAccess] = useState<"all" | "public" | "paid">("all");
  const [query, setQuery] = useState("");
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [loadingId, setLoadingId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: rows } = await supabase.from("portfolio_unlocks").select("portfolio_id").eq("viewer_id", data.user.id);
      setUnlocked((rows ?? []).map((row) => row.portfolio_id));
    });
  }, []);

  const categories = useMemo(() => categoryOrder.filter((name) => name === "全部" || items.some((item) => item.category === name)), [items]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== "全部" && item.category !== category) return false;
      if (access !== "all" && item.visibility !== access) return false;
      if (!normalized) return true;
      return [item.title, item.artist_name, item.category, ...item.tags].some((value) => value.toLowerCase().includes(normalized));
    });
  }, [access, category, items, query]);

  const artists = useMemo(() => {
    const counts = new Map<string, { id: string; name: string; avatar: string | null; count: number }>();
    items.forEach((item) => {
      const current = counts.get(item.artist_id);
      counts.set(item.artist_id, { id: item.artist_id, name: item.artist_name, avatar: item.artist_avatar, count: (current?.count ?? 0) + 1 });
    });
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 6);
  }, [items]);

  async function unlock(item: LobbyItem) {
    setLoadingId(item.id); setMessage("");
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = `/login?next=${encodeURIComponent("/lobby")}`; return; }
    const { error } = await supabase.rpc("unlock_portfolio", { target_portfolio_id: item.id });
    setLoadingId("");
    if (error) { setMessage(error.message.includes("insufficient") ? "点数不足，请先前往定价页面充值。" : error.message); return; }
    setUnlocked((current) => [...new Set([...current, item.id])]);
    setMessage(`已解锁《${item.title}》，现在可以查看完整作品。`);
  }

  return <>
    <section className="overflow-hidden rounded-[38px] bg-ink text-white shadow-soft">
      <div className="grid lg:grid-cols-[1.15fr_.85fr]">
        <div className="p-6 sm:p-9 lg:p-12"><span className="inline-flex min-h-10 items-center gap-2 rounded-pill bg-lime px-4 text-xs font-black text-ink"><Sparkles size={15} />WEIMING 作品大厅</span><h1 className="mt-7 max-w-3xl font-display text-5xl font-black leading-[0.95] sm:text-7xl">沿着作品，<br /><span className="text-lime">遇见创作者。</span></h1><p className="mt-5 max-w-xl text-sm font-semibold leading-7 text-white/62">浏览公开作品、发现画师风格，也可以使用点数解锁创作者设置的付费作品。</p><div className="mt-8 flex flex-wrap gap-3"><span className="rounded-pill border border-white/12 px-4 py-2 text-xs font-black">{items.length} 件作品</span><span className="rounded-pill border border-white/12 px-4 py-2 text-xs font-black">{artists.length} 位活跃画师</span><Link href="/commissions" className="inline-flex min-h-10 items-center gap-2 rounded-pill bg-white px-4 text-xs font-black text-ink">去约稿 <ArrowUpRight size={14} /></Link></div></div>
        <div className="relative hidden min-h-[420px] overflow-hidden border-l border-white/8 lg:block"><div className="absolute inset-0 grid grid-cols-2 gap-3 p-5 rotate-[-3deg] scale-110">{items.slice(0, 4).map((item, index) => <div key={item.id} className={`overflow-hidden rounded-[24px] bg-white/8 ${index % 2 ? "translate-y-8" : "-translate-y-5"}`}><img src={item.image_url} alt="" className="h-full w-full object-cover opacity-78" /></div>)}</div><div className="absolute inset-0 bg-gradient-to-r from-ink via-transparent to-transparent" /></div>
      </div>
    </section>

    {artists.length ? <section className="mt-6 rounded-[28px] border border-line bg-white p-5 shadow-soft"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.16em] text-purple">Artists in focus</p><h2 className="mt-1 font-display text-2xl font-black">从画师开始逛</h2></div><UserRound className="text-purple" /></div><div className="mt-4 flex gap-3 overflow-x-auto pb-1">{artists.map((artist) => <Link key={artist.id} href={`/artists/${artist.id}`} className="flex min-w-48 items-center gap-3 rounded-[18px] bg-bg p-3 transition hover:-translate-y-0.5 hover:bg-primary/10"><span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-purple text-sm font-black text-white">{artist.avatar ? <img src={artist.avatar} alt="" className="h-full w-full object-cover" /> : artist.name.slice(0, 1)}</span><span><strong className="block text-sm">{artist.name}</strong><small className="font-semibold text-muted">{artist.count} 件作品 · 查看主页</small></span></Link>)}</div></section> : null}

    <section className="sticky top-20 z-20 mt-6 rounded-[26px] border border-white/70 bg-white/88 p-4 shadow-soft backdrop-blur-xl"><div className="flex flex-col gap-3 xl:flex-row xl:items-center"><label className="flex min-h-12 flex-1 items-center gap-3 rounded-pill border border-line bg-bg px-4"><Search size={18} className="text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索作品、画师或标签" className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none" /></label><div className="flex gap-2 overflow-x-auto">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`min-h-11 shrink-0 rounded-pill px-4 text-xs font-black transition ${category === item ? "bg-ink text-white" : "bg-bg text-muted hover:text-ink"}`}>{item}</button>)}</div><select value={access} onChange={(event) => setAccess(event.target.value as typeof access)} className="min-h-11 rounded-pill border border-line bg-white px-4 text-xs font-black"><option value="all">全部权限</option><option value="public">公开作品</option><option value="paid">付费作品</option></select></div></section>

    {message ? <p role="status" className="mt-5 rounded-[18px] bg-ink px-5 py-3 text-center text-sm font-black text-white">{message}</p> : null}
    <div className="mt-6 columns-1 gap-5 sm:columns-2 lg:columns-3 xl:columns-4">{filtered.map((item) => {
      const canView = item.visibility === "public" || unlocked.includes(item.id);
      return <article key={item.id} className="group mb-5 break-inside-avoid overflow-hidden rounded-[26px] border border-line bg-white shadow-soft transition hover:-translate-y-1 hover:border-purple/35"><div className="relative overflow-hidden bg-bg"><img src={item.image_url} alt={canView ? item.title : "付费作品预览"} className={`h-auto w-full transition duration-500 group-hover:scale-[1.02] ${canView ? "" : "scale-110 blur-2xl"}`} />{!canView ? <div className="absolute inset-0 grid min-h-60 place-items-center bg-ink/44 p-6 text-center text-white"><div><LockKeyhole className="mx-auto" /><p className="mt-3 text-sm font-black">{item.access_price} 点解锁</p><Button type="button" disabled={loadingId === item.id} onClick={() => unlock(item)} className="mt-3 bg-lime text-ink">{loadingId === item.id ? <LoaderCircle size={15} className="animate-spin" /> : <Eye size={15} />}查看完整作品</Button></div></div> : <span className="absolute left-3 top-3 rounded-pill bg-white/90 px-3 py-1.5 text-[11px] font-black text-ink shadow-soft">{item.category}</span>}</div><div className="p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-xl font-black">{item.title}</h2><Link href={`/artists/${item.artist_id}`} className="mt-1 inline-flex items-center gap-1 text-xs font-black text-purple">{item.artist_name}<ArrowUpRight size={12} /></Link></div>{item.visibility === "paid" ? <LockKeyhole size={15} className="mt-1 shrink-0 text-purple" /> : <Eye size={15} className="mt-1 shrink-0 text-primary" />}</div><div className="mt-3 flex flex-wrap gap-1.5">{item.tags.slice(0, 5).map((tag) => <button key={tag} type="button" onClick={() => setQuery(tag)} className="rounded-pill bg-bg px-2.5 py-1 text-[11px] font-bold text-muted hover:text-ink">#{tag}</button>)}</div></div></article>;
    })}</div>
    {!filtered.length ? <div className="mt-6 grid min-h-52 place-items-center rounded-[28px] border border-dashed border-line bg-white text-center"><div><Images className="mx-auto text-purple" /><p className="mt-3 font-display text-xl font-black">没有匹配的作品</p><button type="button" onClick={() => { setCategory("全部"); setAccess("all"); setQuery(""); }} className="mt-2 text-sm font-black text-purple">清除筛选</button></div></div> : null}
  </>;
}
