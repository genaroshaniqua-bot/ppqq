"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { Eye, LoaderCircle, LockKeyhole, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Item = { id: string; title: string; image_url: string; tags: string[]; category: string; visibility: "public" | "paid"; access_price: number };

export function PublicPortfolioGallery({ items }: { items: Item[] }) {
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [loadingId, setLoadingId] = useState("");
  const [message, setMessage] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: rows } = await supabase.from("portfolio_unlocks").select("portfolio_id").eq("viewer_id", data.user.id);
      setUnlocked((rows ?? []).map((row) => row.portfolio_id));
    });
  }, []);

  async function unlock(id: string) {
    setLoadingId(id); setMessage("");
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`; return; }
    const { error } = await supabase.rpc("unlock_portfolio", { target_portfolio_id: id });
    setLoadingId("");
    if (error) { setMessage(error.message.includes("insufficient") ? "点数不足，请先前往定价页面充值点数。" : error.message); return; }
    setUnlocked((current) => [...new Set([...current, id])]);
    setMessage("作品已解锁，可完整查看。");
  }

  return <><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => {
    const canView = item.visibility === "public" || unlocked.includes(item.id);
    return <article key={item.id} className="overflow-hidden rounded-[24px] border border-line bg-white shadow-soft"><div className="relative aspect-[4/3] overflow-hidden bg-bg"><button type="button" disabled={!canView} onClick={() => setSelectedItem(item)} aria-label={canView ? `打开作品：${item.title}` : undefined} className="absolute inset-0 w-full cursor-zoom-in disabled:cursor-default"><div role="img" aria-label={canView ? item.title : "付费作品预览"} className={`absolute inset-0 bg-cover bg-center transition ${canView ? "" : "scale-110 blur-xl"}`} style={{ backgroundImage: `url(${item.image_url})` }} /></button>{!canView ? <div className="absolute inset-0 grid place-items-center bg-ink/45 p-5 text-center text-white"><div><LockKeyhole className="mx-auto" /><p className="mt-2 text-sm font-black">付费作品</p><p className="mt-1 text-xs font-semibold text-white/75">使用 {item.access_price} 点解锁完整图片</p><Button type="button" disabled={loadingId === item.id} onClick={() => unlock(item.id)} className="mt-3 bg-lime text-ink">{loadingId === item.id ? <LoaderCircle size={15} className="animate-spin" /> : <Eye size={15} />}解锁查看</Button></div></div> : null}</div><div className="p-4"><p className="text-xs font-black text-purple">{item.category}</p><h3 className="mt-1 font-display text-xl font-black">{item.title}</h3><p className="mt-2 text-xs font-bold text-muted">{item.tags.join(" · ")}</p></div></article>;
  })}{!items.length ? <p className="rounded-card border border-dashed border-line bg-white p-6 text-sm font-semibold text-muted">画师尚未添加作品。</p> : null}</div>{message ? <p role="status" className="mt-4 rounded-[16px] bg-ink px-4 py-3 text-sm font-bold text-white">{message}</p> : null}{selectedItem ? <div role="dialog" aria-modal="true" aria-label={selectedItem.title} className="fixed inset-0 z-[80] grid place-items-center bg-ink/88 p-4 backdrop-blur-md" onClick={() => setSelectedItem(null)}><div className="relative max-h-[92vh] max-w-6xl" onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => setSelectedItem(null)} aria-label="关闭大图" className="absolute right-3 top-3 z-10 grid size-11 place-items-center rounded-full bg-white text-ink shadow-soft"><X size={20} /></button><img src={selectedItem.image_url} alt={selectedItem.title} className="max-h-[88vh] max-w-full rounded-[24px] object-contain shadow-2xl" /></div></div> : null}</>;
}
