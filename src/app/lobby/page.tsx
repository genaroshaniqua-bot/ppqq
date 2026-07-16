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
  const items = (portfolioRows ?? []).filter((item) => approved.has(item.artist_id)).map((item) => {
    const profile = profileMap.get(item.artist_id);
    return { ...item, artist_name: profile?.display_name ?? "WEIMING 画师", artist_avatar: profile?.avatar_url ?? null } as LobbyItem;
  });
  return <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8"><LobbyGallery items={items} /></div>;
}
