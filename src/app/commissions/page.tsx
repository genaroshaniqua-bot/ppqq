import Link from "next/link";
import { ArrowRight, FilePlus2, Images, ListChecks } from "lucide-react";
import { ArtistWorkCommissionBrowser, type CommissionArtwork } from "@/components/commissions/ArtistWorkCommissionBrowser";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function CommissionsPage() {
  const supabase = await createSupabaseServerClient();
  const [{ data: portfolioRows }, { data: serviceRows }, { data: approvedRows }] = await Promise.all([
    supabase.from("portfolios").select("id,artist_id,title,image_url,tags,category,visibility,access_price,created_at").order("created_at", { ascending: false }).limit(60),
    supabase.from("artist_services").select("id,artist_id,service_type,base_price").eq("is_active", true),
    supabase.from("artist_profiles").select("user_id,availability").eq("review_status", "approved")
  ]);

  const approved = new Map((approvedRows ?? []).map((artist) => [artist.user_id, artist.availability]));
  const serviceArtistIds = [...new Set((serviceRows ?? []).map((service) => service.artist_id))];
  const { data: profileRows } = serviceArtistIds.length
    ? await supabase.from("profiles").select("id,display_name").in("id", serviceArtistIds)
    : { data: [] };
  const profileMap = new Map((profileRows ?? []).map((profile) => [profile.id, profile.display_name]));
  const servicesByArtist = new Map<string, Array<{ id: string; service_type: string; base_price: number }>>();
  for (const service of serviceRows ?? []) {
    const current = servicesByArtist.get(service.artist_id) ?? [];
    current.push({ ...service, base_price: Number(service.base_price) });
    servicesByArtist.set(service.artist_id, current);
  }

  const artworks: CommissionArtwork[] = (portfolioRows ?? [])
    .filter((item) => approved.has(item.artist_id) && servicesByArtist.has(item.artist_id))
    .map((item) => {
      const services = servicesByArtist.get(item.artist_id) ?? [];
      return {
        id: item.id,
        artistId: item.artist_id,
        artistName: profileMap.get(item.artist_id) ?? "未名画师",
        title: item.title,
        imageUrl: item.image_url,
        tags: item.tags ?? [],
        category: item.category || services[0]?.service_type || "其他",
        visibility: item.visibility,
        accessPrice: Number(item.access_price ?? 0),
        serviceCount: services.length,
        startingPrice: Math.min(...services.map((service) => service.base_price)),
        availability: approved.get(item.artist_id) ?? "open"
      };
    });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Commission</p>
          <h1 className="mt-1 font-display text-4xl font-black tracking-[-0.03em] sm:text-5xl">选择你的约稿方式</h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-muted">直接发布需求，或先从作品判断画风，再进入画师主页选择服务。</p>
        </div>
        <Link href="/profile/commissions" className="inline-flex min-h-10 items-center gap-2 rounded-pill border border-line bg-white px-4 text-xs font-black text-muted shadow-soft transition hover:border-primary hover:text-ink">
          <ListChecks size={15} aria-hidden="true" />查看我的约稿
        </Link>
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-2" aria-label="约稿方式">
        <Link href="/create" className="group flex min-h-[190px] flex-col justify-between rounded-[28px] bg-ink p-6 text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-xl sm:p-7">
          <span className="grid size-12 place-items-center rounded-full bg-lime text-ink"><FilePlus2 size={21} aria-hidden="true" /></span>
          <div className="mt-8">
            <p className="text-xs font-black text-lime">还没有决定画师</p>
            <div className="mt-1 flex items-end justify-between gap-4"><div><h2 className="font-display text-3xl font-black">发起约稿</h2><p className="mt-2 text-sm font-semibold text-white/62">填写预算、档期和授权范围，公开征集画师方案。</p></div><ArrowRight className="mb-1 shrink-0 transition group-hover:translate-x-1" aria-hidden="true" /></div>
          </div>
        </Link>

        <Link href="#artist-work-browser" className="group flex min-h-[190px] flex-col justify-between rounded-[28px] border border-line bg-white p-6 shadow-soft transition hover:-translate-y-0.5 hover:border-primary sm:p-7">
          <span className="grid size-12 place-items-center rounded-full bg-primary/12 text-primary"><Images size={21} aria-hidden="true" /></span>
          <div className="mt-8">
            <p className="text-xs font-black text-primary">先确认画风是否合适</p>
            <div className="mt-1 flex items-end justify-between gap-4"><div><h2 className="font-display text-3xl font-black">根据画师作品约稿</h2><p className="mt-2 text-sm font-semibold text-muted">浏览公开作品，进入画师主页查看服务与套餐。</p></div><ArrowRight className="mb-1 shrink-0 transition group-hover:translate-x-1" aria-hidden="true" /></div>
          </div>
        </Link>
      </section>

      <ArtistWorkCommissionBrowser items={artworks} />
    </div>
  );
}
