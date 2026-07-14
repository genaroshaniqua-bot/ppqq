import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Package, ShieldCheck, Truck } from "lucide-react";
import { ProductPurchasePanel } from "@/components/shop/ProductPurchasePanel";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UserAvatar } from "@/components/profile/UserAvatar";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: product } = await supabase.from("products").select("id, seller_id, title, description, kind, price, cover_url, stock, is_active").eq("id", id).eq("is_active", true).maybeSingle();
  if (!product) notFound();
  const [{ data: seller }, { data: artist }] = await Promise.all([
    supabase.from("profiles").select("display_name, avatar_url, bio").eq("id", product.seller_id).single(),
    supabase.from("artist_profiles").select("headline, review_status").eq("user_id", product.seller_id).maybeSingle()
  ]);
  const DeliveryIcon = product.kind === "physical" ? Truck : Download;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/market" className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-line bg-white px-4 text-sm font-black shadow-soft"><ArrowLeft size={16} aria-hidden="true" />返回商城</Link>
      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-[32px] border border-line bg-white shadow-soft">
            <div className="relative aspect-[16/9] bg-bg">{product.cover_url ? <div role="img" aria-label={`${product.title} 商品封面`} className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${product.cover_url})` }} /> : <div className="grid h-full place-items-center text-primary"><Package size={54} aria-hidden="true" /><span className="sr-only">暂无商品封面</span></div>}<span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-pill bg-white/92 px-4 py-2 text-xs font-black shadow-soft"><DeliveryIcon size={15} />{product.kind === "physical" ? "实体配送" : "数字交付"}</span></div>
            <div className="p-5 sm:p-7"><p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Creator product</p><h1 className="mt-2 font-display text-4xl font-black tracking-[-0.03em] sm:text-5xl">{product.title}</h1><p className="mt-4 text-sm font-semibold leading-7 text-muted">{product.description}</p><div className="mt-6 flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold text-muted">商品价格</p><p className="font-display text-4xl font-black">¥{product.price}</p></div><span className="rounded-pill bg-lime px-4 py-2 text-xs font-black">{product.stock === null ? "无库存限制" : `库存 ${product.stock}`}</span></div></div>
          </section>
          <section className="grid gap-3 sm:grid-cols-3"><article className="rounded-[20px] border border-line bg-white p-4"><ShieldCheck size={20} className="text-primary" /><h2 className="mt-3 text-sm font-black">订单留痕</h2><p className="mt-1 text-xs font-semibold leading-5 text-muted">支付、交付和退款状态均保存到订单。</p></article><article className="rounded-[20px] border border-line bg-white p-4"><DeliveryIcon size={20} className="text-purple" /><h2 className="mt-3 text-sm font-black">{product.kind === "physical" ? "配送履约" : "安全交付"}</h2><p className="mt-1 text-xs font-semibold leading-5 text-muted">{product.kind === "physical" ? "结算时保存地址快照和物流信息。" : "支持私有文件或限时下载链接。"}</p></article><article className="rounded-[20px] border border-line bg-white p-4"><Package size={20} className="text-pink" /><h2 className="mt-3 text-sm font-black">模拟支付</h2><p className="mt-1 text-xs font-semibold leading-5 text-muted">不连接真实银行卡或第三方渠道。</p></article></section>
        </div>
        <aside className="space-y-5 lg:sticky lg:top-24 lg:h-fit">
          <section className="rounded-[24px] border border-line bg-white p-5 shadow-soft"><p className="text-xs font-bold text-muted">创作者</p><div className="mt-3 flex items-center gap-3"><UserAvatar src={seller?.avatar_url} name={seller?.display_name ?? "创"} className="size-12 text-lg" /><div><p className="font-display text-xl font-black">{seller?.display_name ?? "WEIMING 创作者"}</p><p className="text-xs font-bold text-primary">{artist?.review_status === "approved" ? "平台审核画师" : "平台创作者"}</p></div></div><p className="mt-4 text-sm font-semibold leading-6 text-muted">{artist?.headline ?? seller?.bio ?? "创作者尚未填写公开介绍。"}</p>{artist?.review_status === "approved" ? <Link href={`/artists/${product.seller_id}`} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-pill bg-bg text-sm font-black">查看创作者主页</Link> : null}</section>
          <ProductPurchasePanel product={{ ...product, price: Number(product.price) }} />
        </aside>
      </div>
    </div>
  );
}
