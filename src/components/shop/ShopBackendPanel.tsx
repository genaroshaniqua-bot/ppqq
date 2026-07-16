"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, CreditCard, Download, ExternalLink, ImagePlus, LoaderCircle, Minus, Package, Plus, RotateCcw, Send, ShoppingBag, Trash2, Truck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AddressPanel, UserAddress } from "@/components/shop/AddressPanel";

type Product = { id: string; seller_id: string; title: string; description: string; kind: "digital" | "physical" | "custom"; price: number; cover_url: string | null; stock: number | null; is_active: boolean; seller_name?: string };
type CartItem = { product_id: string; quantity: number };
type ShopOrder = { id: string; buyer_id: string; amount: number; payment_status: string; fulfillment_status: string; delivery_method: string | null; delivery_note: string | null; digital_download_url: string | null; delivery_file_path: string | null; tracking_company: string | null; tracking_number: string | null; shipping_address: { label: string; recipient_name: string; phone: string; region: string; detail: string } | null; created_at: string };
type OrderItem = { id: string; order_id: string; product_id: string; quantity: number; unit_price: number };

export type ShopPanelView = "all" | "buyer" | "buyer-orders" | "seller" | "admin";

export function ShopBackendPanel({ view = "all" }: { view?: ShopPanelView }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [downloadLinks, setDownloadLinks] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"all" | "digital" | "physical">("all");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState("");
  const [canSell, setCanSell] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    const [{ data: productRows, error: productError }, { data: cartRows, error: cartError }, { data: orderRows, error: orderError }, { data: itemRows, error: itemError }, { data: addressRows, error: addressError }, { data: profile, error: profileError }] = await Promise.all([
      supabase.from("products").select("id, seller_id, title, description, kind, price, cover_url, stock, is_active").order("created_at"),
      supabase.from("cart_items").select("product_id, quantity").order("created_at"),
      supabase.from("shop_orders").select("id, buyer_id, amount, payment_status, fulfillment_status, delivery_method, delivery_note, digital_download_url, delivery_file_path, tracking_company, tracking_number, shipping_address, created_at").order("created_at", { ascending: false }).limit(30),
      supabase.from("shop_order_items").select("id, order_id, product_id, quantity, unit_price"),
      supabase.from("user_addresses").select("id, label, recipient_name, phone, region, detail, is_default").order("created_at"),
      user ? supabase.from("profiles").select("role").eq("id", user.id).single() : Promise.resolve({ data: null, error: null })
    ]);
    const loadError = productError ?? cartError ?? orderError ?? itemError ?? addressError ?? profileError;
    if (loadError) throw loadError;
    const sellerIds = [...new Set((productRows ?? []).map((product) => product.seller_id))];
    const { data: sellerRows, error: sellerError } = sellerIds.length
      ? await supabase.from("profiles").select("id, display_name").in("id", sellerIds)
      : { data: [], error: null };
    if (sellerError) throw sellerError;
    const sellerNames = new Map((sellerRows ?? []).map((seller) => [seller.id, seller.display_name]));
    setProducts((productRows ?? []).map((product) => ({ ...product, seller_name: sellerNames.get(product.seller_id) ?? "WEIMING 创作者" })) as Product[]);
    setCart((cartRows ?? []) as CartItem[]);
    setOrders((orderRows ?? []) as ShopOrder[]);
    setOrderItems((itemRows ?? []) as OrderItem[]);
    const nextAddresses = (addressRows ?? []) as UserAddress[];
    setAddresses(nextAddresses);
    setSelectedAddressId((current) => current || nextAddresses.find((address) => address.is_default)?.id || nextAddresses[0]?.id || "");
    setUserId(user?.id ?? "");
    setCanSell(profile?.role === "artist" || profile?.role === "admin");
    setIsAdmin(profile?.role === "admin");
    setLoading(false);
  }, []);

  useEffect(() => { load().catch((error) => { setMessage(typeof error === "object" && error && "message" in error ? String(error.message) : "商品数据加载失败"); setLoading(false); }); }, [load]);

  async function setQuantity(productId: string, quantity: number) {
    setSaving(true); setMessage("");
    const { error } = await createSupabaseBrowserClient().rpc("set_cart_quantity", { target_product_id: productId, target_quantity: quantity });
    setSaving(false);
    if (error) { setMessage(error.message); return; }
    setMessage(quantity <= 0 ? "商品已移出购物车" : "真实购物车已更新");
    await load();
  }

  async function checkout() {
    setSaving(true); setMessage("");
    const needsAddress = cart.some((item) => products.find((product) => product.id === item.product_id)?.kind === "physical");
    if (needsAddress && !selectedAddressId) { setSaving(false); setMessage("实体商品结算前请先保存并选择收货地址"); return; }
    const { data: orderId, error } = await createSupabaseBrowserClient().rpc("checkout_shop_cart_with_address", { target_address_id: needsAddress ? selectedAddressId : null });
    setSaving(false);
    if (error) { setMessage(error.message); return; }
    setMessage(`模拟支付成功，商品订单 ${String(orderId).slice(0, 8)} 已生成`);
    setCheckoutOpen(false);
    window.dispatchEvent(new Event("notification-read"));
    await load();
  }

  function beginCheckout() {
    if (cart.length === 0) return;
    setCheckoutOpen(true);
    window.requestAnimationFrame(() => document.getElementById("shop-checkout")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  async function createAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget; const form = new FormData(formElement);
    setSaving(true); setMessage("");
    const { data, error } = await createSupabaseBrowserClient().from("user_addresses").insert({ user_id: userId, label: String(form.get("label")), recipient_name: String(form.get("recipient")), phone: String(form.get("phone")), region: String(form.get("region")), detail: String(form.get("detail")), is_default: addresses.length === 0 }).select("id").single();
    setSaving(false); if (error) { setMessage(error.message); return; }
    formElement.reset(); setSelectedAddressId(data.id); setMessage("收货地址已安全保存"); await load();
  }

  async function uploadDeliveryFile(orderId: string, file: File, note: string) {
    if (file.size > 20 * 1024 * 1024) { setMessage("交付文件不能超过 20MB"); return; }
    setSaving(true); setMessage("");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-"); const path = `${userId}/${orderId}/${Date.now()}-${safeName}`;
    const supabase = createSupabaseBrowserClient();
    const { error: uploadError } = await supabase.storage.from("digital-deliveries").upload(path, file, { upsert: false });
    if (uploadError) { setSaving(false); setMessage(uploadError.message); return; }
    const { error } = await supabase.rpc("attach_shop_delivery_file", { target_order_id: orderId, object_path: path, fulfillment_note: note });
    setSaving(false); if (error) { setMessage(error.message); return; }
    setMessage("私有数字文件已上传并交付"); await load();
  }

  async function createDownloadLink(orderId: string, path: string) {
    const { data, error } = await createSupabaseBrowserClient().storage.from("digital-deliveries").createSignedUrl(path, 600);
    if (error) { setMessage(error.message); return; }
    setDownloadLinks((current) => ({ ...current, [orderId]: data.signedUrl }));
  }

  async function publishProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const kind = String(form.get("kind")) as "digital" | "physical";
    setSaving(true); setMessage("");
    const coverFile = form.get("coverImage");
    const supabase = createSupabaseBrowserClient();
    let coverUrl: string | null = null;
    if (coverFile instanceof File && coverFile.size > 0) {
      if (!coverFile.type.startsWith("image/")) { setSaving(false); setMessage("商品封面必须是图片文件"); return; }
      if (coverFile.size > 10 * 1024 * 1024) { setSaving(false); setMessage("商品封面不能超过 10MB"); return; }
      const extension = coverFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/products/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("portfolios").upload(path, coverFile, { contentType: coverFile.type, upsert: false });
      if (uploadError) { setSaving(false); setMessage(uploadError.message); return; }
      coverUrl = supabase.storage.from("portfolios").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.rpc("publish_shop_product", {
      product_title: String(form.get("title") ?? ""), product_description: String(form.get("description") ?? ""),
      product_kind: kind, product_price: Number(form.get("price")), product_stock: kind === "physical" ? Number(form.get("stock")) : null,
      product_cover_url: coverUrl
    });
    setSaving(false);
    if (error) { setMessage(error.message); return; }
    formElement.reset(); setMessage("商品已发布到真实商店"); await load();
  }

  async function advanceOrder(orderId: string, action: "shipped" | "delivered" | "received" | "refund") {
    setSaving(true); setMessage("");
    const { error } = await createSupabaseBrowserClient().rpc("advance_shop_order", { target_order_id: orderId, action });
    setSaving(false);
    if (error) { setMessage(error.message); return; }
    setMessage(action === "refund" ? "管理员已完成模拟退款并恢复库存" : action === "received" ? "商品订单已确认完成" : "商品履约状态已更新");
    await load();
  }

  async function submitFulfillment(orderId: string, method: "digital" | "shipping", note: string, detailA: string, detailB: string) {
    setSaving(true); setMessage("");
    const { error } = await createSupabaseBrowserClient().rpc("submit_shop_fulfillment", {
      target_order_id: orderId, fulfillment_method: method, fulfillment_note: note,
      download_url: method === "digital" ? detailA : null, shipping_company: method === "shipping" ? detailA : null,
      shipping_number: method === "shipping" ? detailB : null
    });
    setSaving(false);
    if (error) { setMessage(error.message); return; }
    setMessage(method === "digital" ? "数字商品下载地址已交付" : "物流信息已提交并通知买家");
    await load();
  }

  async function toggleProduct(product: Product) {
    setSaving(true); setMessage("");
    const supabase = createSupabaseBrowserClient();
    const moderationReason = view === "admin" ? window.prompt("请填写本次商品状态变更原因（至少 4 个字）")?.trim() : null;
    if (view === "admin" && (!moderationReason || moderationReason.length < 4)) {
      setSaving(false); setMessage("管理员变更商品状态时必须填写至少 4 个字的原因。"); return;
    }
    const { error } = view === "admin"
      ? await supabase.rpc("admin_moderate_product", { target_product_id: product.id, next_active: !product.is_active, moderation_reason: moderationReason })
      : await supabase.from("products").update({ is_active: !product.is_active }).eq("id", product.id);
    setSaving(false);
    if (error) { setMessage(error.message); return; }
    setMessage(product.is_active ? "商品已下架" : "商品已重新上架");
    await load();
  }

  const showBuyer = view === "all" || view === "buyer";
  const showSeller = view === "all" || view === "seller";
  const filtered = products.filter((product) => product.is_active && (filter === "all" || product.kind === filter));
  const managedProducts = products.filter((product) => view === "admin" || product.seller_id === userId);
  const cartRows = cart.map((item) => ({ ...item, product: products.find((product) => product.id === item.product_id) })).filter((item) => item.product);
  const total = useMemo(() => cartRows.reduce((sum, item) => sum + Number(item.product?.price ?? 0) * item.quantity, 0), [cartRows]);
  const cartNeedsAddress = cartRows.some((item) => item.product?.kind === "physical");
  const visibleOrders = orders.filter((order) => {
    if (view === "buyer" || view === "buyer-orders") return order.buyer_id === userId;
    if (view === "seller") return orderItems.some((item) => item.order_id === order.id && products.find((product) => product.id === item.product_id)?.seller_id === userId);
    return true;
  });

  if (loading) return <div className="flex min-h-56 items-center justify-center"><LoaderCircle className="animate-spin text-primary" /></div>;

  return <>
    {message ? <p role="status" className="mb-5 rounded-pill bg-ink px-5 py-3 text-center text-sm font-black text-white">{message}</p> : null}
    {showSeller && canSell ? <form onSubmit={publishProduct} className="mb-6 rounded-card border border-primary/25 bg-white p-5 shadow-soft"><div className="flex items-center gap-3"><Package className="text-primary" /><h2 className="font-display text-2xl font-black">卖家发布商品</h2></div><div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5"><input name="title" required minLength={3} placeholder="商品名称" className="h-11 rounded-[14px] border border-line bg-bg px-3 text-sm font-bold outline-none" /><select name="kind" className="h-11 rounded-[14px] border border-line bg-bg px-3 text-sm font-bold"><option value="digital">数字商品</option><option value="physical">实体周边</option></select><input name="price" required type="number" min="1" placeholder="价格" className="h-11 rounded-[14px] border border-line bg-bg px-3 text-sm font-bold" /><input name="stock" type="number" min="0" placeholder="实体库存" className="h-11 rounded-[14px] border border-line bg-bg px-3 text-sm font-bold" /><Button type="submit" disabled={saving}><Plus size={16} />{saving ? "正在同步" : "发布商品"}</Button><label className="flex min-h-24 cursor-pointer items-center justify-center gap-3 rounded-[14px] border-2 border-dashed border-purple/25 bg-purple/5 px-4 text-sm font-black text-purple md:col-span-2"><ImagePlus size={19} />选择本地商品封面<input name="coverImage" type="file" accept="image/*" className="sr-only" /></label><textarea name="description" required minLength={10} rows={3} placeholder="商品内容、格式、授权或交付说明" className="rounded-[14px] border border-line bg-bg p-3 text-sm font-semibold outline-none md:col-span-2 lg:col-span-3" /><p className="self-center text-xs font-semibold leading-5 text-muted lg:col-span-5">发布时会先把本地图片同步到云端，再将封面与商品绑定。支持 JPG、PNG、WebP，最大 10MB。</p></div></form> : null}
    {showSeller || view === "admin" ? <section className="mb-6 rounded-card border border-line bg-white p-5 shadow-soft"><div className="flex items-center justify-between gap-3"><h2 className="font-display text-2xl font-black">{view === "admin" ? "商品内容管理" : "我的商品"}</h2><span className="rounded-pill bg-bg px-3 py-1 text-xs font-black text-muted">{managedProducts.length} 项</span></div><div className="mt-4 grid gap-3 md:grid-cols-2">{managedProducts.map((product) => <article key={product.id} className="rounded-[18px] bg-bg p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black text-primary">{product.kind === "digital" ? "数字商品" : "实体商品"}</p><h3 className="mt-1 font-display text-lg font-black">{product.title}</h3></div><span className={`rounded-pill px-3 py-1 text-xs font-black ${product.is_active ? "bg-lime text-ink" : "bg-line text-muted"}`}>{product.is_active ? "在售" : "已下架"}</span></div><div className="mt-3 flex items-center justify-between gap-3"><p className="text-sm font-black">¥{product.price}{product.stock !== null ? ` · 库存 ${product.stock}` : ""}</p><Button type="button" variant="secondary" disabled={saving} onClick={() => toggleProduct(product)}>{product.is_active ? "下架" : "重新上架"}</Button></div></article>)}{managedProducts.length === 0 ? <p className="text-sm font-semibold text-muted">暂无可管理商品。</p> : null}</div></section> : null}
    {showBuyer ? <div className="mb-6 flex gap-2 overflow-x-auto pb-1">{[["all","全部"],["digital","数字商品"],["physical","实体周边"]].map(([value,label]) => <button key={value} type="button" onClick={() => setFilter(value as typeof filter)} className={`min-h-11 shrink-0 rounded-pill px-4 text-sm font-black ${filter === value ? "bg-ink text-white" : "bg-white text-muted shadow-soft"}`}>{label}</button>)}</div> : null}
    {showBuyer ? <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="grid gap-4 sm:grid-cols-2">{filtered.map((product) => { const quantity = cart.find((item) => item.product_id === product.id)?.quantity ?? 0; const DeliveryIcon = product.kind === "digital" ? Download : Truck; return <article key={product.id} className="group overflow-hidden rounded-card border border-line bg-white shadow-soft transition hover:-translate-y-0.5 hover:border-primary"><div className="relative aspect-[16/9] overflow-hidden bg-bg">{product.cover_url ? <div role="img" aria-label={`${product.title} 商品封面`} className="absolute inset-0 bg-cover bg-center transition duration-300 group-hover:scale-[1.03]" style={{ backgroundImage: `url(${product.cover_url})` }} /> : <div className="grid h-full place-items-center text-primary"><Package size={38} aria-hidden="true" /><span className="sr-only">暂无商品封面</span></div>}<span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-pill bg-white/92 px-3 py-1.5 text-xs font-black text-ink shadow-soft"><DeliveryIcon size={13} aria-hidden="true" />{product.kind === "digital" ? "数字交付" : "实体配送"}</span></div><div className="p-5"><p className="text-xs font-black text-purple">{product.seller_name}</p><h2 className="mt-1 font-display text-2xl font-black">{product.title}</h2><p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">{product.description}</p><Link href={`/market/${product.id}`} className="mt-3 inline-flex text-xs font-black text-purple">查看商品详情 →</Link><div className="mt-5 flex items-center justify-between gap-3"><span className="font-display text-2xl font-black">¥{product.price}</span>{quantity === 0 ? <Button type="button" disabled={saving} onClick={() => setQuantity(product.id, 1)}><ShoppingBag size={16} />加入购物车</Button> : <div className="flex items-center gap-2"><button aria-label={`减少-${product.title}`} disabled={saving} onClick={() => setQuantity(product.id, quantity - 1)} className="grid size-9 place-items-center rounded-pill bg-bg"><Minus size={15} /></button><span className="min-w-6 text-center font-black">{quantity}</span><button aria-label={`增加-${product.title}`} disabled={saving} onClick={() => setQuantity(product.id, quantity + 1)} className="grid size-9 place-items-center rounded-pill bg-bg"><Plus size={15} /></button></div>}</div>{product.stock !== null ? <p className="mt-3 text-xs font-bold text-muted">库存 {product.stock}</p> : <p className="mt-3 text-xs font-bold text-primary">即时数字交付 · 无库存限制</p>}</div></article>; })}</section>
      <aside className="h-fit space-y-4 lg:sticky lg:top-24">{selectedProduct ? <section className="rounded-card border border-purple/20 bg-white p-5 shadow-soft"><p className="text-xs font-black uppercase text-purple">Product Detail</p><h2 className="mt-2 font-display text-2xl font-black">{selectedProduct.title}</h2><p className="mt-1 text-xs font-black text-purple">来自 {selectedProduct.seller_name}</p><p className="mt-3 text-sm font-semibold leading-6 text-muted">{selectedProduct.description}</p><div className="mt-4 flex items-center justify-between"><span className="font-display text-3xl font-black">¥{selectedProduct.price}</span><span className="rounded-pill bg-purple/10 px-3 py-1 text-xs font-black text-purple">{selectedProduct.kind === "digital" ? "即时数字交付" : `库存 ${selectedProduct.stock}`}</span></div></section> : null}<section className="rounded-card border border-line bg-white p-5 shadow-soft"><div className="flex items-center justify-between"><h2 className="font-display text-2xl font-black">购物车</h2><span className="rounded-pill bg-lime px-3 py-1 text-xs font-black">{cart.reduce((sum,item) => sum + item.quantity,0)} 件</span></div><div className="mt-4 space-y-3">{cartRows.map((item) => <div key={item.product_id} className="rounded-[18px] bg-bg p-3"><div className="flex justify-between gap-3"><p className="text-sm font-black">{item.product?.title}</p><button aria-label={`移除-${item.product?.title}`} onClick={() => setQuantity(item.product_id,0)}><Trash2 size={15} className="text-danger" /></button></div><p className="mt-2 text-xs font-bold text-muted">¥{item.product?.price} × {item.quantity}</p></div>)}{cartRows.length === 0 ? <p className="rounded-[18px] bg-bg px-4 py-7 text-center text-sm font-semibold text-muted">先浏览商品，再进入结算</p> : null}</div><div className="mt-5 flex items-center justify-between border-t border-line pt-4"><span className="text-sm font-black">合计</span><span className="font-display text-3xl font-black">¥{total}</span></div><Button type="button" disabled={saving || cartRows.length === 0} onClick={beginCheckout} className="mt-4 w-full"><CreditCard size={16} />进入结算</Button><p className="mt-3 text-xs font-semibold leading-5 text-muted">结算时才确认交付方式；数字商品无需填写收货地址。</p></section></aside>
    </div> : null}
    {showBuyer && checkoutOpen && cartRows.length > 0 ? <section id="shop-checkout" className="mt-7 scroll-mt-28 rounded-[30px] border border-lime bg-ink p-5 text-white shadow-soft sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-lime">Checkout</p><h2 className="mt-1 font-display text-3xl font-black">确认交付与模拟支付</h2><p className="mt-2 text-sm font-semibold text-white/62">本次共 {cart.reduce((sum, item) => sum + item.quantity, 0)} 件商品，合计 ¥{total}。</p></div><button type="button" onClick={() => setCheckoutOpen(false)} className="rounded-pill border border-white/16 px-4 py-2 text-xs font-black text-white">返回继续选购</button></div>{cartNeedsAddress ? <div className="mt-5 text-ink"><AddressPanel addresses={addresses} selectedId={selectedAddressId} saving={saving} onSelect={setSelectedAddressId} onCreate={createAddress} /></div> : <div className="mt-5 flex items-center gap-3 rounded-[18px] bg-white/8 p-4"><span className="grid size-10 place-items-center rounded-full bg-lime text-ink"><Download size={18} aria-hidden="true" /></span><div><p className="text-sm font-black">全部为数字商品</p><p className="mt-1 text-xs font-semibold text-white/58">付款后由画师通过订单安全交付文件，无需收货地址。</p></div></div>}<div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-white/12 pt-5"><div><p className="text-xs font-bold text-white/54">应付金额</p><p className="font-display text-4xl font-black text-lime">¥{total}</p></div><Button type="button" disabled={saving || (cartNeedsAddress && !selectedAddressId)} onClick={checkout}><CreditCard size={16} />确认模拟支付</Button></div></section> : null}
    <section className="mt-8 rounded-card border border-line bg-white p-5 shadow-soft">
      <div className="flex items-center gap-3"><CheckCircle2 className="text-primary" /><h2 className="font-display text-2xl font-black">商品订单明细与交付</h2></div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">{visibleOrders.map((order) => {
        const items = orderItems.filter((item) => item.order_id === order.id);
        const ownProducts = items.some((item) => products.find((product) => product.id === item.product_id)?.seller_id === userId);
        const digitalOnly = items.length > 0 && items.every((item) => products.find((product) => product.id === item.product_id)?.kind === "digital");
        return <article key={order.id} className="rounded-[18px] bg-bg p-4">
          <div className="flex justify-between gap-3"><div><p className="text-sm font-black">订单 {order.id.slice(0,8)}</p><p className="mt-2 font-display text-2xl font-black">¥{order.amount}</p></div><p className="text-xs font-bold text-primary">{order.payment_status === "paid" ? "模拟支付成功" : order.payment_status === "refunded" ? "已退款" : order.payment_status} · {{processing:"处理中",shipped:"已发货",delivered:"已交付",completed:"已完成",refunded:"已退款"}[order.fulfillment_status] ?? order.fulfillment_status}</p></div>
          <div className="mt-3 space-y-2">{items.map((item) => <div key={item.id} className="flex justify-between rounded-[14px] bg-white px-3 py-2 text-xs font-bold"><span>{products.find((product) => product.id === item.product_id)?.title ?? "商品"} × {item.quantity}</span><span>¥{Number(item.unit_price) * item.quantity}</span></div>)}</div>
          {order.shipping_address ? <div className="mt-3 rounded-[14px] bg-blue/5 p-3 text-xs font-semibold leading-5 text-muted"><p className="font-black text-blue">收货地址快照</p><p className="mt-1">{order.shipping_address.recipient_name} · {order.shipping_address.phone}<br />{order.shipping_address.region} {order.shipping_address.detail}</p></div> : null}
          {order.delivery_method ? <div className="mt-3 rounded-[14px] border border-primary/20 bg-white p-3 text-xs font-semibold leading-5 text-muted"><p className="font-black text-ink">{order.delivery_method === "shipping" ? "物流信息" : "数字交付资料"}</p>{order.digital_download_url ? <a href={order.digital_download_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-black text-purple">打开下载地址 <ExternalLink size={12} /></a> : null}{order.delivery_file_path ? <><Button type="button" variant="secondary" className="mt-2" onClick={() => createDownloadLink(order.id, order.delivery_file_path!)}>生成 10 分钟下载链接</Button>{downloadLinks[order.id] ? <a href={downloadLinks[order.id]} target="_blank" rel="noreferrer" className="mt-2 block font-black text-purple">下载私有文件 <ExternalLink className="inline" size={12} /></a> : null}</> : null}{order.tracking_number ? <p className="mt-2">{order.tracking_company} · {order.tracking_number}</p> : null}<p className="mt-1">{order.delivery_note}</p></div> : null}
          {(showSeller || view === "admin") && ownProducts && order.fulfillment_status === "processing" ? <FulfillmentForm orderId={order.id} digital={digitalOnly} saving={saving} onSubmit={submitFulfillment} onFileSubmit={uploadDeliveryFile} /> : null}
          <div className="mt-3 flex flex-wrap gap-2">{(view === "buyer" || view === "buyer-orders" || view === "all") && order.buyer_id === userId && order.fulfillment_status === "delivered" ? <Button type="button" disabled={saving} onClick={() => advanceOrder(order.id,"received")}><CheckCircle2 size={14} />确认收货</Button> : null}{view === "admin" && isAdmin && order.payment_status === "paid" ? <Button type="button" variant="danger" disabled={saving} onClick={() => advanceOrder(order.id,"refund")}><RotateCcw size={14} />模拟退款</Button> : null}</div>
          <time className="mt-3 block text-xs font-semibold text-muted">{new Date(order.created_at).toLocaleString("zh-CN")}</time>
        </article>;
      })}{visibleOrders.length === 0 ? <p className="text-sm font-semibold text-muted">当前没有符合此工作区的商品订单。</p> : null}</div>
    </section>
  </>;
}

function FulfillmentForm({ orderId, digital, saving, onSubmit, onFileSubmit }: { orderId: string; digital: boolean; saving: boolean; onSubmit: (orderId: string, method: "digital" | "shipping", note: string, detailA: string, detailB: string) => Promise<void>; onFileSubmit: (orderId: string, file: File, note: string) => Promise<void> }) {
  const [note, setNote] = useState(""); const [detailA, setDetailA] = useState(""); const [detailB, setDetailB] = useState(""); const [file, setFile] = useState<File | null>(null);
  return <div className="mt-3 grid gap-2 rounded-[14px] border border-purple/20 bg-white p-3"><p className="text-xs font-black text-purple">{digital ? "上传私有文件或提交下载地址" : "填写实体物流信息"}</p>{digital ? <input aria-label={`交付文件-${orderId}`} type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="rounded-[12px] border border-dashed border-purple/30 bg-purple/5 p-3 text-xs font-bold" /> : null}<input aria-label={`${digital ? "备用下载地址" : "物流公司"}-${orderId}`} value={detailA} onChange={(event) => setDetailA(event.target.value)} placeholder={digital ? "备用：https://example.com/download" : "物流公司"} className="h-10 rounded-[12px] border border-line bg-bg px-3 text-sm font-semibold outline-none" />{!digital ? <input aria-label={`物流单号-${orderId}`} value={detailB} onChange={(event) => setDetailB(event.target.value)} placeholder="物流单号" className="h-10 rounded-[12px] border border-line bg-bg px-3 text-sm font-semibold outline-none" /> : null}<textarea aria-label={`交付说明-${orderId}`} value={note} onChange={(event) => setNote(event.target.value)} rows={2} placeholder="交付内容、解压方式或物流备注" className="rounded-[12px] border border-line bg-bg p-3 text-sm font-semibold outline-none" /><div className="flex flex-wrap gap-2">{digital && file ? <Button type="button" disabled={saving || note.trim().length < 5} onClick={() => onFileSubmit(orderId, file, note)}><Send size={14} />上传并安全交付</Button> : null}<Button type="button" variant={digital ? "secondary" : "primary"} disabled={saving || note.trim().length < 5 || detailA.trim().length < 4 || (!digital && detailB.trim().length < 4)} onClick={() => onSubmit(orderId, digital ? "digital" : "shipping", note, detailA, detailB)}><Send size={14} />{digital ? "使用备用地址交付" : "提交物流信息"}</Button></div></div>;
}
