import Link from "next/link";
import { FilePlus2, ListChecks } from "lucide-react";
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

  const curated: CommissionArtwork[] = [
    ["poster-01.jpg", "心动女仆日", "立绘", ["女仆", "角色"]],
    ["poster-02.jpg", "午后苏打", "头像", ["日常", "清新"]],
    ["poster-03.jpg", "星轨取景框", "海报", ["镜头", "城市"]],
    ["poster-04.jpg", "银色双生", "立绘", ["双人", "幻想"]],
    ["poster-05.jpg", "花嫁时刻", "立绘", ["礼服", "氛围"]],
    ["poster-06.jpg", "霓虹晴日", "海报", ["街景", "潮流"]],
    ["poster-07.jpg", "蓝色呼吸", "头像", ["运动", "夏日"]],
    ["poster-08.jpg", "星球开场", "海报", ["网球", "活力"]],
    ["poster-09.jpg", "深海来信", "设定", ["水族", "幻想"]],
    ["poster-10.png", "星光魔法", "设定", ["魔法少女", "梦幻"]],
    ["poster-11.png", "花境精灵", "头像", ["精灵", "柔光"]]
  ].map(([file, title, category, tags], index) => ({
    id: `curated-${index + 1}`,
    artistId: "",
    artistName: "未名精选灵感",
    title: String(title),
    imageUrl: `/images/lobby-posters/${file}`,
    tags: tags as string[],
    category: String(category),
    visibility: "public",
    accessPrice: 0,
    serviceCount: 0,
    startingPrice: 0,
    availability: "inspiration"
  }));

  return (
    <div className="-my-8 min-h-screen bg-[#1d1d29] text-white">
      <div className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#a893ff]">Commission gallery</p>
            <h1 className="mt-3 font-display text-4xl font-black tracking-[-0.035em] sm:text-6xl">从作品开始，找到合适画师</h1>
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-white/55">浏览画风后选择画师服务；还没有明确人选，也可以直接公开需求。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/create" className="inline-flex min-h-11 items-center gap-2 rounded-pill bg-lime px-5 text-sm font-black text-ink transition hover:bg-primary"><FilePlus2 size={16} aria-hidden="true" />发起约稿</Link>
            <Link href="/profile/commissions" className="inline-flex min-h-11 items-center gap-2 rounded-pill bg-white/8 px-5 text-sm font-black text-white transition hover:bg-white/14"><ListChecks size={16} aria-hidden="true" />我的约稿</Link>
          </div>
        </header>

        <ArtistWorkCommissionBrowser items={[...artworks, ...curated]} />
      </div>
    </div>
  );
}
