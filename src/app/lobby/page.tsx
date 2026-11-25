import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LobbyGallery, type LobbyItem } from "@/components/lobby/LobbyGallery";
import { resolvePortfolioImage } from "@/lib/portfolio-media";
import curatedRecords from "@/data/lobby-curated.json";

const licensedCurated = curatedRecords.map((item) => ({
  ...item, artist_id: "", artist_avatar: null, visibility: "public", access_price: 0,
  created_at: "2026-11-25T00:00:00.000Z", source: "curated"
})) as LobbyItem[];

export default async function LobbyPage() {
  const supabase = await createSupabaseServerClient();
  const { data: portfolioRows } = await supabase.from("portfolios").select("id,artist_id,title,image_url,tags,category,visibility,access_price,created_at").order("created_at", { ascending: false }).limit(120);
  const artistIds = [...new Set((portfolioRows ?? []).map((item) => item.artist_id))];
  const [{ data: profiles }, { data: approvedArtists }] = await Promise.all([
    artistIds.length ? supabase.from("public_profiles").select("id,display_name,avatar_url").in("id", artistIds) : Promise.resolve({ data: [] }),
    artistIds.length ? supabase.from("artist_profiles").select("user_id").in("user_id", artistIds).eq("review_status", "approved") : Promise.resolve({ data: [] })
  ]);
  const approved = new Set((approvedArtists ?? []).map((artist) => artist.user_id));
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const portfolioItems = await Promise.all((portfolioRows ?? []).filter((item) => approved.has(item.artist_id)).map(async (item) => {
    const profile = profileMap.get(item.artist_id);
    const imageUrl = await resolvePortfolioImage(supabase, item.image_url);
    return { ...item, image_url: imageUrl, media_reference: item.image_url, artist_name: profile?.display_name ?? "WEIMING 画师", artist_avatar: profile?.avatar_url ?? null, source: "portfolio" } as LobbyItem;
  }));
  const items = [...licensedCurated, ...portfolioItems];
  return <div className="mx-auto w-full min-w-0 max-w-[1440px] px-3 py-4 sm:px-6 sm:py-8 lg:px-8"><LobbyGallery items={items} /></div>;
}
