"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, LoaderCircle, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Application = {
  user_id: string;
  headline: string | null;
  introduction: string | null;
  review_status: "draft" | "pending" | "approved" | "rejected";
  availability: string;
  display_name?: string;
};

export function ArtistReviewPanel() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadApplications() {
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("请先登录");
    const { data: admin } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (admin?.role !== "admin") throw new Error("当前账号没有管理员权限");

    const { data: artists, error: artistError } = await supabase
      .from("artist_profiles")
      .select("user_id, headline, introduction, review_status, availability")
      .order("created_at", { ascending: false });
    if (artistError) throw artistError;

    const ids = (artists ?? []).map((item) => item.user_id);
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("id, display_name").in("id", ids)
      : { data: [] as { id: string; display_name: string }[] };
    const names = new Map((profiles ?? []).map((item) => [item.id, item.display_name]));
    setApplications((artists ?? []).map((item) => ({ ...item, display_name: names.get(item.user_id) ?? "未命名用户" })) as Application[]);
  }

  useEffect(() => {
    loadApplications().catch((reason) => setError(reason instanceof Error ? reason.message : "审核列表加载失败")).finally(() => setLoading(false));
  }, []);

  async function review(userId: string, status: "approved" | "rejected") {
    const supabase = createSupabaseBrowserClient();
    const { error: reviewError } = await supabase.rpc("review_artist_application", {
      target_user_id: userId,
      decision: status
    });
    if (reviewError) {
      setError(reviewError.message);
      return;
    }
    setApplications((current) => current.map((item) => item.user_id === userId ? { ...item, review_status: status } : item));
  }

  return (
    <div className="mx-auto min-h-[calc(100dvh-5rem)] max-w-6xl px-4 py-8 sm:px-6">
      <Link href="/profile" className="inline-flex items-center gap-2 text-sm font-black text-muted hover:text-ink"><ArrowLeft size={17} />返回个人中心</Link>
      <div className="mt-5 flex items-center gap-4">
        <span className="grid size-14 place-items-center rounded-pill bg-lime text-ink"><ShieldCheck /></span>
        <div><p className="text-xs font-black uppercase text-primary">Admin Console</p><h1 className="font-display text-4xl font-black">画师入驻审核</h1></div>
      </div>
      {loading ? <div className="mt-10 flex justify-center"><LoaderCircle className="animate-spin text-primary" /></div> : null}
      {error ? <p role="alert" className="mt-6 rounded-card border border-danger/30 bg-danger/5 p-4 text-sm font-bold text-danger">{error}</p> : null}
      {!loading && !error && applications.length === 0 ? <p className="mt-8 rounded-card border border-line bg-white p-8 text-center text-sm font-bold text-muted shadow-soft">暂时没有画师入驻申请。</p> : null}
      <div className="mt-8 grid gap-4">
        {applications.map((item) => (
          <article key={item.user_id} className="rounded-card border border-line bg-white p-5 shadow-soft sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="text-sm font-black text-purple">{item.display_name}</p><h2 className="mt-1 font-display text-2xl font-black">{item.headline}</h2></div>
              <span className="rounded-pill bg-bg px-3 py-2 text-xs font-black text-muted">{item.review_status}</span>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm font-semibold leading-7 text-muted">{item.introduction}</p>
            <div className="mt-5 flex gap-3">
              <Button type="button" onClick={() => review(item.user_id, "approved")} disabled={item.review_status === "approved"}><Check size={16} />通过</Button>
              <Button type="button" variant="danger" onClick={() => review(item.user_id, "rejected")} disabled={item.review_status === "rejected"}><X size={16} />拒绝</Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
