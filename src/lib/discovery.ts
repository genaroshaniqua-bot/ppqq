import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { signPortfolioImage } from "@/lib/portfolio-media";
export type DiscoveryService = {
  id: string; artistId: string; title: string; creator: string; status: string; price: string;
  rating: string; reviews: string; tags: string[]; image: string; imagePosition: string; sale: boolean; days: number; placeholder: boolean;
};
export type DiscoveryCreator = { name: string; handle: string; role: string; score: string; onTime: string; badges: string[]; image: string; href: string };
export async function loadDiscovery() {
  const client = createSupabaseBrowserClient();
  const [{ data: services, error: serviceError }, { data: artists, error: artistError }, { data: profiles, error: profileError }, { data: portfolios, error: portfolioError }, { data: reviews, error: reviewError }] = await Promise.all([
    client.from("artist_services").select("id,artist_id,title,service_type,base_price,delivery_days").eq("is_active",true).order("created_at",{ascending:false}),
    client.from("artist_profiles").select("user_id,headline,review_status,availability").eq("review_status","approved"),
    client.from("public_profiles").select("id,display_name"),
    client.from("portfolios").select("artist_id,image_url").eq("visibility","public").order("created_at",{ascending:false}),
    client.from("artist_reviews").select("artist_id,rating")
  ]);
  if (serviceError || artistError || profileError || portfolioError || reviewError) throw new Error("服务目录暂时无法加载，请重试。");
  const available = new Map((artists ?? []).map(a=>[a.user_id,a]));
  const names = new Map((profiles ?? []).map(p=>[p.id,p.display_name]));
  const covers = new Map<string,string>();
  await Promise.all((artists ?? []).map(async artist=>{
    const first = portfolios?.find(p=>p.artist_id===artist.user_id);
    if (first) {
      const image = await signPortfolioImage(client,first.image_url);
      if (image) covers.set(artist.user_id,image);
    }
  }));
  const items: DiscoveryService[] = (services ?? []).filter(s=>available.has(s.artist_id)).map(service=>{
    const ratings=(reviews ?? []).filter(r=>r.artist_id===service.artist_id);
    return {id:service.id,artistId:service.artist_id,title:service.title,creator:names.get(service.artist_id) ?? "创作者",status:available.get(service.artist_id)?.availability==='open'?'OPEN':'暂停接单',price:`¥${service.base_price} 起`,rating:ratings.length?(ratings.reduce((n,r)=>n+r.rating,0)/ratings.length).toFixed(1):"暂无评价",reviews:String(ratings.length),tags:[service.service_type,`${service.delivery_days} 天`],days:service.delivery_days,image:covers.get(service.artist_id) ?? '/images/lobby-posters/poster-01.jpg',imagePosition:'center',sale:false,placeholder:!covers.has(service.artist_id)};
  });
  const creators: DiscoveryCreator[] = (artists ?? []).filter(a=>items.some(s=>s.artistId===a.user_id)).map(a=>({name:names.get(a.user_id) ?? '创作者',handle:a.user_id.slice(0,8),role:a.headline ?? '创作者服务',score:items.find(s=>s.artistId===a.user_id)?.rating ?? '暂无评价',onTime:'交付以约定为准',badges:[a.availability==='open'?'开放委托':'暂停接单'],image:covers.get(a.user_id) ?? '/images/lobby-posters/poster-01.jpg',href:`/artists/${a.user_id}`}));
  return { services:items, creators };
}
