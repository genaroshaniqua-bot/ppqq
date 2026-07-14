import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, CalendarDays, Clock3, MessageSquareText, ShieldCheck, Star } from "lucide-react";
import { ServiceRequestPanel, type ServicePackage } from "@/components/commissions/ServiceRequestPanel";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UserAvatar } from "@/components/profile/UserAvatar";

export default async function CommissionServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: service } = await supabase.from("artist_services").select("id, artist_id, title, description, service_type, base_price, revision_limit, delivery_days, is_active").eq("id", id).eq("is_active", true).maybeSingle();
  if (!service) notFound();

  const [{ data: profile }, { data: artist }, { data: packageRows }, { data: portfolios }, { data: reviews }] = await Promise.all([
    supabase.from("profiles").select("display_name, avatar_url, bio").eq("id", service.artist_id).single(),
    supabase.from("artist_profiles").select("headline, introduction, availability, response_time_hours, review_status").eq("user_id", service.artist_id).single(),
    supabase.from("service_packages").select("id, tier, title, description, price, delivery_days, revision_limit, features").eq("service_id", service.id).eq("is_active", true).order("position"),
    supabase.from("portfolios").select("id, title, image_url, tags").eq("artist_id", service.artist_id).order("created_at", { ascending: false }).limit(4),
    supabase.from("artist_reviews").select("id, rating, body, created_at").eq("artist_id", service.artist_id).order("created_at", { ascending: false }).limit(3)
  ]);
  const averageRating = reviews?.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/commissions" className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-line bg-white px-4 text-sm font-black shadow-soft"><ArrowLeft size={16} aria-hidden="true" />返回服务列表</Link>

      <section className="mt-5 grid gap-6 overflow-hidden rounded-[34px] bg-ink p-6 text-white shadow-soft sm:p-8 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="flex flex-wrap gap-2"><span className="rounded-pill bg-lime px-3 py-1.5 text-xs font-black text-ink">{service.service_type}</span><span className="rounded-pill border border-white/12 px-3 py-1.5 text-xs font-black">默认禁止 AI 训练</span></div>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-black tracking-[-0.035em] sm:text-5xl">{service.title}</h1>
          <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-white/68">{service.description}</p>
          <div className="mt-6 flex flex-wrap gap-3 text-xs font-black text-white/72"><span className="inline-flex items-center gap-2"><CalendarDays size={15} className="text-lime" />基础交付 {service.delivery_days} 天</span><span>含 {service.revision_limit} 次修改</span><span>¥{service.base_price} 起</span></div>
        </div>
        <aside className="rounded-[24px] border border-white/10 bg-white/[0.07] p-5">
          <div className="flex items-center gap-3"><UserAvatar src={profile?.avatar_url} name={profile?.display_name ?? "画"} className="size-12 text-lg ring-2 ring-white/12" /><div><p className="text-xs font-bold text-white/52">服务画师</p><p className="font-display text-xl font-black">{profile?.display_name ?? "WEIMING 画师"}</p></div></div>
          <p className="mt-4 text-sm font-semibold leading-6 text-white/62">{artist?.headline ?? profile?.bio ?? "专注 OC 与二次元角色创作"}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-black"><span className="rounded-[14px] bg-white/8 p-3"><Clock3 size={14} className="mb-2 text-lime" />{artist?.response_time_hours ? `${artist.response_time_hours} 小时内响应` : "响应时间待更新"}</span><span className="rounded-[14px] bg-white/8 p-3"><Star size={14} className="mb-2 text-lime" />{averageRating ? `${averageRating.toFixed(1)} 分` : "暂无评价"}</span></div>
          <Link href={`/artists/${service.artist_id}`} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-pill bg-white text-sm font-black text-ink"><BadgeCheck size={16} aria-hidden="true" />查看公开画师主页</Link>
        </aside>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <ServiceRequestPanel service={{ ...service, base_price: Number(service.base_price) }} packages={(packageRows ?? []).map((item) => ({ ...item, price: Number(item.price) })) as ServicePackage[]} />
        <aside className="space-y-5">
          <section className="rounded-[24px] border border-line bg-white p-5 shadow-soft"><div className="flex items-center gap-2"><ShieldCheck size={19} className="text-primary" /><h2 className="font-display text-xl font-black">委托保障</h2></div><div className="mt-4 space-y-3 text-sm font-semibold leading-6 text-muted"><p>画师发送最终报价后，由你确认并模拟支付定金。</p><p>草稿和成稿均需要委托人审核，修改次数按套餐记录。</p><p>发生争议后订单冻结，由管理员查看履约记录并裁定。</p></div></section>
          <section className="rounded-[24px] border border-line bg-white p-5 shadow-soft"><div className="flex items-center gap-2"><MessageSquareText size={19} className="text-purple" /><h2 className="font-display text-xl font-black">近期评价</h2></div><div className="mt-4 space-y-3">{reviews?.map((review) => <article key={review.id} className="rounded-[16px] bg-bg p-3"><p className="text-xs font-black text-primary">{"★".repeat(review.rating)} · 已完成委托</p><p className="mt-2 text-xs font-semibold leading-5 text-muted">{review.body}</p></article>)}{!reviews?.length ? <p className="text-sm font-semibold text-muted">完成首笔委托后，这里会展示真实评价。</p> : null}</div></section>
        </aside>
      </div>

      {portfolios?.length ? <section className="mt-7"><h2 className="font-display text-3xl font-black">相关作品</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{portfolios.map((item) => <article key={item.id} className="overflow-hidden rounded-[22px] border border-line bg-white shadow-soft"><div role="img" aria-label={item.title} className="aspect-[4/3] bg-bg bg-cover bg-center" style={{ backgroundImage: `url(${item.image_url})` }} /><div className="p-4"><p className="font-display text-lg font-black">{item.title}</p><p className="mt-1 text-xs font-bold text-muted">{item.tags.join(" · ")}</p></div></article>)}</div></section> : null}
    </div>
  );
}
