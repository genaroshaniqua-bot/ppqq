import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, CalendarDays, Clock3, Images, MessageSquareText, Star } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { PublicPortfolioGallery } from "@/components/artist/PublicPortfolioGallery";

export default async function PublicArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const [{ data: profile }, { data: artist }] = await Promise.all([
    supabase.from("profiles").select("id, display_name, avatar_url, bio, created_at").eq("id", id).maybeSingle(),
    supabase.from("artist_profiles").select("headline, introduction, availability, response_time_hours, review_status").eq("user_id", id).eq("review_status", "approved").maybeSingle()
  ]);
  if (!profile || !artist) notFound();

  const [{ data: portfolios }, { data: services }, { data: reviews }] = await Promise.all([
    supabase.from("portfolios").select("id,title,image_url,tags,category,visibility,access_price").eq("artist_id", id).order("created_at", { ascending: false }),
    supabase.from("artist_services").select("id, title, description, service_type, base_price, delivery_days, revision_limit").eq("artist_id", id).eq("is_active", true).order("created_at", { ascending: false }),
    supabase.from("artist_reviews").select("id, rating, communication_rating, quality_rating, body, created_at").eq("artist_id", id).order("created_at", { ascending: false })
  ]);
  const reviewCount = reviews?.length ?? 0;
  const averageRating = reviewCount ? reviews!.reduce((sum, review) => sum + review.rating, 0) / reviewCount : null;
  const communicationRating = reviewCount ? reviews!.reduce((sum, review) => sum + review.communication_rating, 0) / reviewCount : null;
  const qualityRating = reviewCount ? reviews!.reduce((sum, review) => sum + review.quality_rating, 0) / reviewCount : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/commissions" className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-line bg-white px-4 text-sm font-black shadow-soft"><ArrowLeft size={16} aria-hidden="true" />返回找画师</Link>

      <section className="mt-5 overflow-hidden rounded-[34px] bg-ink p-6 text-white shadow-soft sm:p-8">
        <div className="grid gap-7 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <div className="flex items-center gap-4"><UserAvatar src={profile.avatar_url} name={profile.display_name} className="size-16 text-2xl ring-2 ring-white/18" /><div><p className="inline-flex items-center gap-1 text-xs font-black text-lime"><BadgeCheck size={14} aria-hidden="true" />平台审核画师</p><h1 className="mt-1 font-display text-4xl font-black sm:text-5xl">{profile.display_name}</h1></div></div>
            <p className="mt-5 max-w-3xl font-display text-2xl font-black leading-tight sm:text-3xl">{artist.headline ?? "用作品和清晰规则建立长期合作"}</p>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-white/64">{artist.introduction ?? profile.bio ?? "画师尚未补充公开介绍。"}</p>
          </div>
          <aside className="grid grid-cols-2 gap-2 rounded-[24px] border border-white/10 bg-white/[0.06] p-4">
            <div className="rounded-[16px] bg-white/8 p-3"><Star size={17} className="text-lime" /><p className="mt-3 font-display text-2xl font-black">{averageRating ? averageRating.toFixed(1) : "—"}</p><p className="text-xs font-bold text-white/52">综合评分</p></div>
            <div className="rounded-[16px] bg-white/8 p-3"><MessageSquareText size={17} className="text-lime" /><p className="mt-3 font-display text-2xl font-black">{reviewCount}</p><p className="text-xs font-bold text-white/52">完成评价</p></div>
            <div className="rounded-[16px] bg-white/8 p-3"><Clock3 size={17} className="text-lime" /><p className="mt-3 text-sm font-black">{artist.response_time_hours ? `${artist.response_time_hours} 小时内` : "待更新"}</p><p className="text-xs font-bold text-white/52">通常响应</p></div>
            <div className="rounded-[16px] bg-white/8 p-3"><CalendarDays size={17} className="text-lime" /><p className="mt-3 text-sm font-black">{artist.availability === "open" ? "开放约稿" : artist.availability === "queue" ? "排队中" : "暂停接单"}</p><p className="text-xs font-bold text-white/52">当前档期</p></div>
          </aside>
        </div>
      </section>

      <section className="mt-7" aria-labelledby="artist-services-heading">
        <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Commission services</p><h2 id="artist-services-heading" className="mt-1 font-display text-3xl font-black">可委托服务</h2></div><span className="rounded-pill bg-white px-3 py-2 text-xs font-black text-muted shadow-soft">{services?.length ?? 0} 项</span></div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{services?.map((service) => <article key={service.id} className="flex flex-col rounded-card border border-line bg-white p-5 shadow-soft"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black text-purple">{service.service_type}</p><h3 className="mt-1 font-display text-xl font-black">{service.title}</h3></div><span className="shrink-0 rounded-pill bg-lime px-3 py-1.5 text-xs font-black">¥{service.base_price} 起</span></div><p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-muted">{service.description}</p><p className="mt-auto pt-5 text-xs font-black text-muted">{service.delivery_days} 天 · {service.revision_limit} 次修改</p><Link href={`/commissions/${service.id}`} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-pill bg-ink px-4 text-sm font-black text-white">查看套餐与详情</Link></article>)}{!services?.length ? <p className="rounded-card border border-dashed border-line bg-white p-6 text-sm font-semibold text-muted">该画师暂未发布可委托服务。</p> : null}</div>
      </section>

      <section className="mt-8" aria-labelledby="artist-portfolio-heading"><div className="flex items-center gap-2"><Images size={20} className="text-primary" /><h2 id="artist-portfolio-heading" className="font-display text-3xl font-black">作品集</h2></div><PublicPortfolioGallery items={portfolios ?? []} /></section>

      <section className="mt-8 rounded-[30px] border border-line bg-white p-5 shadow-soft sm:p-6" aria-labelledby="artist-reviews-heading">
        <div className="grid gap-5 lg:grid-cols-[260px_1fr]"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Verified reviews</p><h2 id="artist-reviews-heading" className="mt-1 font-display text-3xl font-black">真实委托评价</h2><div className="mt-5 grid grid-cols-2 gap-2 text-xs font-bold text-muted"><p className="rounded-[14px] bg-bg p-3">沟通<br /><strong className="text-lg text-ink">{communicationRating ? communicationRating.toFixed(1) : "—"}</strong></p><p className="rounded-[14px] bg-bg p-3">成品<br /><strong className="text-lg text-ink">{qualityRating ? qualityRating.toFixed(1) : "—"}</strong></p></div></div><div className="space-y-3">{reviews?.map((review) => <article key={review.id} className="rounded-[18px] bg-bg p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-black text-primary">{"★".repeat(review.rating)} <span className="text-muted">已验证委托</span></p><time className="text-xs font-bold text-muted">{new Date(review.created_at).toLocaleDateString("zh-CN")}</time></div><p className="mt-3 text-sm font-semibold leading-6 text-muted">{review.body}</p></article>)}{!reviews?.length ? <p className="rounded-[18px] bg-bg p-5 text-sm font-semibold text-muted">完成委托并支付尾款后，委托人可以留下第一条真实评价。</p> : null}</div></div>
      </section>
    </div>
  );
}
