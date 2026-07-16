import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LobbyGallery, type LobbyItem } from "@/components/lobby/LobbyGallery";

export default async function LobbyPage() {
  const supabase = await createSupabaseServerClient();
  const { data: portfolioRows } = await supabase.from("portfolios").select("id,artist_id,title,image_url,tags,category,visibility,access_price,created_at").order("created_at", { ascending: false }).limit(120);
  const artistIds = [...new Set((portfolioRows ?? []).map((item) => item.artist_id))];
  const [{ data: profiles }, { data: approvedArtists }] = await Promise.all([
    artistIds.length ? supabase.from("profiles").select("id,display_name,avatar_url").in("id", artistIds) : Promise.resolve({ data: [] }),
    artistIds.length ? supabase.from("artist_profiles").select("user_id").in("user_id", artistIds).eq("review_status", "approved") : Promise.resolve({ data: [] })
  ]);
  const approved = new Set((approvedArtists ?? []).map((artist) => artist.user_id));
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const portfolioItems = (portfolioRows ?? []).filter((item) => approved.has(item.artist_id)).map((item) => {
    const profile = profileMap.get(item.artist_id);
    return { ...item, artist_name: profile?.display_name ?? "WEIMING 画师", artist_avatar: profile?.avatar_url ?? null, source: "portfolio" } as LobbyItem;
  });
  const curatedPosters: LobbyItem[] = [
    ["poster-01.jpg", "心动女仆日", ["女仆", "Q版", "角色"]], ["poster-02.jpg", "午后苏打", ["日常", "少女", "清新"]],
    ["poster-03.jpg", "星轨取景框", ["镜头", "城市", "角色"]], ["poster-04.jpg", "银色双生", ["双人", "银发", "幻想"]],
    ["poster-05.jpg", "花嫁时刻", ["花嫁", "礼服", "氛围"]], ["poster-06.jpg", "霓虹晴日", ["街景", "潮流", "少女"]],
    ["poster-07.jpg", "蓝色呼吸", ["运动", "蓝色", "夏日"]], ["poster-08.jpg", "星球开场", ["运动", "网球", "活力"]],
    ["poster-09.jpg", "深海来信", ["水族", "粉色", "幻想"]], ["poster-10.png", "星光魔法", ["魔法少女", "星光", "梦幻"]],
    ["poster-11.png", "花境精灵", ["精灵", "粉色", "幻想"]]
  ].map(([file, title, tags], index) => ({ id: `curated-${index + 1}`, artist_id: "", artist_name: "大厅精选", artist_avatar: null, title: String(title), image_url: `/images/lobby-posters/${file}`, tags: tags as string[], category: "海报", visibility: "public", access_price: 0, created_at: new Date(2026, 6, 16, 12, index).toISOString(), source: "curated" }));
  const items = [...curatedPosters, ...portfolioItems];
  return <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8"><LobbyGallery items={items} /></div>;
}
