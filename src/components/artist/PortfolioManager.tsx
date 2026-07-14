"use client";

/* eslint-disable @next/next/no-img-element */

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ExternalLink, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type PortfolioItem = { id: string; title: string; image_url: string; tags: string[]; created_at: string };

export function PortfolioManager() {
  const [userId, setUserId] = useState("");
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("请先登录后管理作品集");
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.from("portfolios").select("id, title, image_url, tags, created_at").eq("artist_id", user.id).order("created_at", { ascending: false });
    if (error) throw error;
    setUserId(user.id); setItems((data ?? []) as PortfolioItem[]); setLoading(false);
  }, []);

  useEffect(() => { load().catch((error) => { setMessage(typeof error === "object" && error && "message" in error ? String(error.message) : "作品集加载失败"); setLoading(false); }); }, [load]);

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget; const form = new FormData(formElement);
    setSaving(true); setMessage("");
    const { error } = await createSupabaseBrowserClient().from("portfolios").insert({
      artist_id: userId,
      title: String(form.get("title") ?? "").trim(),
      image_url: String(form.get("imageUrl") ?? "").trim(),
      tags: String(form.get("tags") ?? "").split(/[,，]/).map((tag) => tag.trim()).filter(Boolean).slice(0, 8)
    });
    setSaving(false);
    if (error) { setMessage(error.message); return; }
    formElement.reset(); setMessage("作品已加入公开作品集"); await load();
  }

  async function removeItem(item: PortfolioItem) {
    if (!window.confirm(`确认从作品集移除「${item.title}」吗？`)) return;
    setSaving(true); setMessage("");
    const { error } = await createSupabaseBrowserClient().from("portfolios").delete().eq("id", item.id);
    setSaving(false);
    if (error) { setMessage(error.message); return; }
    setMessage("作品已移除"); await load();
  }

  if (loading) return <div className="grid min-h-52 place-items-center"><LoaderCircle className="animate-spin text-primary" /></div>;

  return (
    <section>
      {message ? <p role="status" className="mb-5 rounded-pill bg-ink px-5 py-3 text-center text-sm font-black text-white">{message}</p> : null}
      <form onSubmit={addItem} className="rounded-card border border-line bg-white p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-purple/12 text-purple"><ImagePlus size={19} /></span>
          <div><p className="text-xs font-black uppercase text-purple">Portfolio item</p><h2 className="font-display text-2xl font-black">添加作品</h2></div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1.5fr_1fr_auto]">
          <input name="title" required minLength={2} placeholder="作品标题" className="h-11 rounded-[14px] border border-line bg-bg px-3 text-sm font-semibold" />
          <input name="imageUrl" type="url" required placeholder="https://example.com/artwork.jpg" className="h-11 rounded-[14px] border border-line bg-bg px-3 text-sm font-semibold" />
          <input name="tags" placeholder="OC，半身，厚涂" className="h-11 rounded-[14px] border border-line bg-bg px-3 text-sm font-semibold" />
          <Button type="submit" disabled={saving}><ImagePlus size={15} />添加作品</Button>
        </div>
        <p className="mt-3 text-xs font-semibold text-muted">填写可公开访问的图片地址；标题、图片和标签会展示给委托人。</p>
      </form>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <article key={item.id} className="overflow-hidden rounded-card border border-line bg-white shadow-soft">
            <div className="aspect-[4/3] bg-bg"><img src={item.image_url} alt={item.title} className="h-full w-full object-cover" /></div>
            <div className="p-5">
              <h2 className="font-display text-xl font-black">{item.title}</h2>
              <div className="mt-3 flex flex-wrap gap-2">{item.tags.map((tag) => <span key={tag} className="rounded-pill bg-bg px-3 py-1 text-xs font-bold text-muted">{tag}</span>)}</div>
              <div className="mt-4 flex gap-2">
                <a href={item.image_url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-pill bg-ink px-4 text-sm font-black text-white">查看原图<ExternalLink size={14} /></a>
                <Button type="button" variant="danger" disabled={saving} onClick={() => removeItem(item)}><Trash2 size={15} /></Button>
              </div>
            </div>
          </article>
        ))}
        {items.length === 0 ? <p className="rounded-card border border-dashed border-line bg-white p-8 text-center text-sm font-semibold text-muted md:col-span-2 xl:col-span-3">还没有作品。添加第一张代表作，让委托人了解你的画风。</p> : null}
      </div>
    </section>
  );
}
