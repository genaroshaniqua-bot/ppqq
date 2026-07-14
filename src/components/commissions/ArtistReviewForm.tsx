"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ArtistReviewForm({ orderId }: { orderId: string }) {
  const [existing, setExisting] = useState<{ rating: number; body: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    createSupabaseBrowserClient().from("artist_reviews").select("rating, body").eq("order_id", orderId).maybeSingle().then(({ data }) => setExisting(data));
  }, [orderId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    const { error } = await createSupabaseBrowserClient().rpc("submit_artist_review", {
      target_order_id: orderId,
      rating_value: Number(form.get("rating")),
      communication_value: Number(form.get("communication")),
      quality_value: Number(form.get("quality")),
      review_body: String(form.get("body"))
    });
    setSaving(false);
    if (error) return setMessage(error.message);
    const body = String(form.get("body"));
    setExisting({ rating: Number(form.get("rating")), body });
    setMessage("评价已发布到画师公开主页。");
  }

  if (existing) return <div className="mt-4 rounded-[14px] border border-primary/20 bg-white p-3"><p className="flex items-center gap-2 text-xs font-black text-primary"><CheckCircle2 size={14} />已评价 · {"★".repeat(existing.rating)}</p><p className="mt-2 text-xs font-semibold leading-5 text-muted">{existing.body}</p>{message ? <p className="mt-2 text-xs font-black text-primary">{message}</p> : null}</div>;

  return <details className="mt-4 rounded-[14px] border border-line bg-white p-3"><summary className="cursor-pointer text-xs font-black text-purple">为这次委托评价画师</summary><form onSubmit={submit} className="mt-3 grid gap-3"><div className="grid grid-cols-3 gap-2">{[["rating","综合"],["communication","沟通"],["quality","成品"]].map(([name,label]) => <label key={name} className="text-xs font-black">{label}<select name={name} defaultValue="5" className="mt-1 h-9 w-full rounded-[10px] border border-line bg-bg px-2"><option value="5">5 分</option><option value="4">4 分</option><option value="3">3 分</option><option value="2">2 分</option><option value="1">1 分</option></select></label>)}</div><label className="text-xs font-black">评价内容<textarea name="body" required minLength={10} maxLength={500} rows={3} placeholder="说明沟通、交付和成品体验" className="mt-1 w-full rounded-[10px] border border-line bg-bg p-3 text-sm font-semibold" /></label>{message ? <p role="status" className="text-xs font-bold text-danger">{message}</p> : null}<Button type="submit" disabled={saving}><Star size={14} />发布评价</Button></form></details>;
}
