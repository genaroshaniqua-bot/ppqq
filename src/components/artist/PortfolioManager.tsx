"use client";

/* eslint-disable @next/next/no-img-element */

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Eye, ImagePlus, LoaderCircle, LockKeyhole, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type PortfolioItem = { id: string; title: string; image_url: string; tags: string[]; category: string; visibility: "public" | "paid"; access_price: number; created_at: string };

const categories = ["头像", "立绘", "海报", "插画", "Live2D", "表情徽章", "角色设定", "周边设计", "其他"];
const quickTags = ["头像", "立绘", "半身", "全身", "海报", "厚涂", "赛璐璐", "Q版", "Live2D", "表情", "商用", "原创角色"];

export function PortfolioManager() {
  const [userId, setUserId] = useState("");
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<"public" | "paid">("public");

  const load = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage("请先登录后管理作品集"); setLoading(false); return; }
    const { data, error } = await supabase.from("portfolios").select("id,title,image_url,tags,category,visibility,access_price,created_at").eq("artist_id", user.id).order("created_at", { ascending: false });
    if (error) throw error;
    setUserId(user.id); setItems((data ?? []) as PortfolioItem[]); setLoading(false);
  }, []);

  useEffect(() => { load().catch((error) => { setMessage(error instanceof Error ? error.message : "作品集加载失败"); setLoading(false); }); }, [load]);
  useEffect(() => () => { if (preview.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);

  const grouped = useMemo(() => categories.map((category) => ({ category, count: items.filter((item) => item.category === category).length })).filter((item) => item.count), [items]);

  function chooseFile(next: File | null) {
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(next ? URL.createObjectURL(next) : "");
  }

  function toggleTag(tag: string) {
    setSelectedTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : current.length < 8 ? [...current, tag] : current);
  }

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const urlInput = String(form.get("imageUrl") ?? "").trim();
    if (!file && !urlInput) { setMessage("请选择本地图片，或填写可访问的图片地址。"); return; }
    if (file && !file.type.startsWith("image/")) { setMessage("请选择 JPG、PNG、WebP 等图片文件。"); return; }
    if (file && file.size > 10 * 1024 * 1024) { setMessage("作品图片不能超过 10MB。"); return; }
    setSaving(true); setMessage("");
    const supabase = createSupabaseBrowserClient();
    let imageUrl = urlInput;
    if (file) {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/portfolio/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("portfolios").upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) { setSaving(false); setMessage(uploadError.message); return; }
      imageUrl = supabase.storage.from("portfolios").getPublicUrl(path).data.publicUrl;
    }
    const manualTags = String(form.get("tags") ?? "").split(/[,，、\n]/).map((tag) => tag.trim()).filter(Boolean);
    const tags = [...new Set([...selectedTags, ...manualTags])].slice(0, 8);
    const accessPrice = visibility === "paid" ? Number(form.get("accessPrice")) : 0;
    const { error } = await supabase.from("portfolios").insert({ artist_id: userId, title: String(form.get("title") ?? "").trim(), image_url: imageUrl, category: String(form.get("category")), tags, visibility, access_price: accessPrice });
    setSaving(false);
    if (error) { setMessage(error.message); return; }
    formElement.reset(); chooseFile(null); setSelectedTags([]); setVisibility("public"); setMessage("作品图片与展示设置已同步保存。"); await load();
  }

  async function removeItem(item: PortfolioItem) {
    if (!window.confirm(`确认从作品集中移除“${item.title}”吗？`)) return;
    setSaving(true); setMessage("");
    const { error } = await createSupabaseBrowserClient().from("portfolios").delete().eq("id", item.id);
    setSaving(false);
    if (error) { setMessage(error.message); return; }
    setMessage("作品已移除"); await load();
  }

  if (loading) return <div className="grid min-h-52 place-items-center"><LoaderCircle className="animate-spin text-primary" /></div>;

  return <section>
    {message ? <p role="status" className="mb-5 rounded-[18px] bg-ink px-5 py-3 text-center text-sm font-black text-white">{message}</p> : null}
    <form onSubmit={addItem} className="rounded-card border border-line bg-white p-5 shadow-soft">
      <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full bg-purple/12 text-purple"><ImagePlus size={19} /></span><div><p className="text-xs font-black uppercase text-purple">Portfolio item</p><h2 className="font-display text-2xl font-black">添加作品</h2></div></div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[260px_1fr]">
        <label className="group grid min-h-52 cursor-pointer place-items-center overflow-hidden rounded-[22px] border-2 border-dashed border-purple/25 bg-bg text-center transition hover:border-purple">
          {preview ? <img src={preview} alt="作品预览" className="h-full min-h-52 w-full object-cover" /> : <span className="p-6"><Upload className="mx-auto text-purple" /><strong className="mt-3 block text-sm">从本地选择作品图片</strong><small className="mt-2 block font-semibold text-muted">JPG、PNG、WebP，最大 10MB</small></span>}
          <input type="file" accept="image/*" className="sr-only" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />
        </label>
        <div className="grid content-start gap-4 sm:grid-cols-2">
          <label className="text-sm font-black">作品标题<input name="title" required minLength={2} placeholder="例如：春日角色立绘" className="mt-2 h-11 w-full rounded-[14px] border border-line bg-bg px-3 text-sm font-semibold" /></label>
          <label className="text-sm font-black">作品集分类<select name="category" className="mt-2 h-11 w-full rounded-[14px] border border-line bg-bg px-3 text-sm font-semibold">{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="text-sm font-black sm:col-span-2">备用图片地址（选填）<input name="imageUrl" type="url" placeholder="也可以粘贴 https:// 图片地址" className="mt-2 h-11 w-full rounded-[14px] border border-line bg-bg px-3 text-sm font-semibold" /></label>
          <div className="sm:col-span-2"><p className="text-sm font-black">快捷标签（最多 8 个）</p><div className="mt-2 flex flex-wrap gap-2">{quickTags.map((tag) => <button key={tag} type="button" aria-pressed={selectedTags.includes(tag)} onClick={() => toggleTag(tag)} className={`rounded-pill px-3 py-2 text-xs font-black transition ${selectedTags.includes(tag) ? "bg-purple text-white" : "bg-bg text-muted hover:text-ink"}`}>{tag}</button>)}</div></div>
          <label className="text-sm font-black sm:col-span-2">补充标签（选填）<input name="tags" placeholder="用逗号分隔自定义标签" className="mt-2 h-11 w-full rounded-[14px] border border-line bg-bg px-3 text-sm font-semibold" /></label>
          <div className="sm:col-span-2"><p className="text-sm font-black">查看权限</p><div className="mt-2 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => setVisibility("public")} className={`rounded-[16px] border p-4 text-left ${visibility === "public" ? "border-primary bg-primary/10" : "border-line"}`}><Eye size={17} /><strong className="mt-2 block text-sm">公开展示</strong><small className="text-muted">访客可直接查看完整作品</small></button><button type="button" onClick={() => setVisibility("paid")} className={`rounded-[16px] border p-4 text-left ${visibility === "paid" ? "border-purple bg-purple/10" : "border-line"}`}><LockKeyhole size={17} /><strong className="mt-2 block text-sm">付费查看</strong><small className="text-muted">访客使用点数解锁作品</small></button></div></div>
          {visibility === "paid" ? <label className="text-sm font-black">解锁点数<input name="accessPrice" type="number" min="1" max="9999" required defaultValue="30" className="mt-2 h-11 w-full rounded-[14px] border border-line bg-bg px-3" /></label> : null}
          <Button type="submit" disabled={saving} className="self-end"><ImagePlus size={15} />{saving ? "正在同步图片" : "添加作品"}</Button>
        </div>
      </div>
    </form>
    {grouped.length ? <div className="mt-5 flex flex-wrap gap-2">{grouped.map((item) => <span key={item.category} className="rounded-pill bg-white px-4 py-2 text-xs font-black shadow-soft">{item.category} · {item.count}</span>)}</div> : null}
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <article key={item.id} className="overflow-hidden rounded-card border border-line bg-white shadow-soft"><div className="relative aspect-[4/3] bg-bg"><img src={item.image_url} alt={item.title} className="h-full w-full object-cover" /><span className="absolute left-3 top-3 rounded-pill bg-ink/85 px-3 py-1 text-xs font-black text-white">{item.visibility === "paid" ? `${item.access_price} 点解锁` : "公开"}</span></div><div className="p-5"><p className="text-xs font-black text-purple">{item.category}</p><h2 className="mt-1 font-display text-xl font-black">{item.title}</h2><div className="mt-3 flex flex-wrap gap-2">{item.tags.map((tag) => <span key={tag} className="rounded-pill bg-bg px-3 py-1 text-xs font-bold text-muted">{tag}</span>)}</div><Button type="button" variant="danger" disabled={saving} onClick={() => removeItem(item)} className="mt-4 w-full"><Trash2 size={15} />移除作品</Button></div></article>)}{items.length === 0 ? <p className="rounded-card border border-dashed border-line bg-white p-8 text-center text-sm font-semibold text-muted md:col-span-2 xl:col-span-3">还没有作品。请从本地添加第一张代表作。</p> : null}</div>
  </section>;
}
