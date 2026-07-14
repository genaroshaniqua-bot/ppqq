"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { CheckCircle2, CreditCard, Download, LoaderCircle, Minus, Plus, Truck } from "lucide-react";
import { AddressPanel, type UserAddress } from "@/components/shop/AddressPanel";
import { Button } from "@/components/ui/Button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ProductPurchasePanelProps = {
  product: {
    id: string;
    title: string;
    kind: "digital" | "physical" | "custom";
    price: number;
    stock: number | null;
  };
};

export function ProductPurchasePanel({ product }: ProductPurchasePanelProps) {
  const [quantity, setQuantity] = useState(1);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(product.kind === "physical");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [orderId, setOrderId] = useState("");
  const needsAddress = product.kind === "physical";

  const loadAddresses = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? "");
    if (!user || !needsAddress) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.from("user_addresses").select("id, label, recipient_name, phone, region, detail, is_default").order("created_at");
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    const next = (data ?? []) as UserAddress[];
    setAddresses(next);
    setSelectedAddressId(next.find((address) => address.is_default)?.id ?? next[0]?.id ?? "");
    setLoading(false);
  }, [needsAddress]);

  useEffect(() => { loadAddresses(); }, [loadAddresses]);

  async function createAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    const { data, error } = await createSupabaseBrowserClient().from("user_addresses").insert({
      user_id: userId,
      label: String(form.get("label")),
      recipient_name: String(form.get("recipient")),
      phone: String(form.get("phone")),
      region: String(form.get("region")),
      detail: String(form.get("detail")),
      is_default: addresses.length === 0
    }).select("id").single();
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setSelectedAddressId(data.id);
    await loadAddresses();
  }

  async function simulatePayment() {
    setSaving(true);
    setMessage("");
    const { data, error } = await createSupabaseBrowserClient().rpc("checkout_single_product", {
      target_product_id: product.id,
      target_quantity: quantity,
      target_address_id: needsAddress ? selectedAddressId : null
    });
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setOrderId(String(data));
    setMessage("模拟支付成功，商品订单已生成。");
  }

  if (loading) return <div className="grid min-h-40 place-items-center rounded-[24px] border border-line bg-white"><LoaderCircle className="animate-spin text-primary" /></div>;

  return (
    <section className="rounded-[28px] border border-line bg-white p-5 shadow-soft sm:p-6" aria-labelledby="product-checkout-heading">
      <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Direct checkout</p><h2 id="product-checkout-heading" className="mt-1 font-display text-2xl font-black">模拟支付</h2></div><span className="inline-flex items-center gap-1 rounded-pill bg-bg px-3 py-2 text-xs font-black text-muted">{needsAddress ? <Truck size={14} /> : <Download size={14} />}{needsAddress ? "实体配送" : "数字交付"}</span></div>
      <div className="mt-5 flex items-center justify-between rounded-[18px] bg-bg p-4"><div><p className="text-xs font-bold text-muted">单价</p><p className="font-display text-3xl font-black">¥{product.price}</p></div><div className="flex items-center gap-2"><button type="button" aria-label="减少数量" disabled={quantity <= 1} onClick={() => setQuantity((current) => Math.max(1, current - 1))} className="grid size-10 place-items-center rounded-full bg-white disabled:opacity-40"><Minus size={15} /></button><span className="min-w-8 text-center font-black">{quantity}</span><button type="button" aria-label="增加数量" disabled={product.stock !== null && quantity >= product.stock} onClick={() => setQuantity((current) => current + 1)} className="grid size-10 place-items-center rounded-full bg-white disabled:opacity-40"><Plus size={15} /></button></div></div>
      {needsAddress ? <div className="mt-5"><AddressPanel addresses={addresses} selectedId={selectedAddressId} saving={saving} onSelect={setSelectedAddressId} onCreate={createAddress} /></div> : <div className="mt-5 flex items-start gap-3 rounded-[18px] bg-primary/10 p-4"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-white"><Download size={16} /></span><div><p className="text-sm font-black">无需填写收货地址</p><p className="mt-1 text-xs font-semibold leading-5 text-muted">付款后由创作者通过订单交付数字文件或下载链接。</p></div></div>}
      <div className="mt-5 flex items-center justify-between border-t border-line pt-5"><div><p className="text-xs font-bold text-muted">应付金额</p><p className="font-display text-4xl font-black">¥{product.price * quantity}</p></div><Button type="button" disabled={saving || (needsAddress && !selectedAddressId)} onClick={simulatePayment}><CreditCard size={16} />确认模拟支付</Button></div>
      <p className="mt-3 text-xs font-semibold leading-5 text-muted">模拟支付不会连接银行卡或第三方支付渠道，但会生成真实 Supabase 订单记录。</p>
      {message ? <div role="status" className="mt-4 rounded-[16px] bg-ink p-4 text-sm font-bold text-white"><p className="flex items-center gap-2"><CheckCircle2 size={16} className="text-lime" />{message}</p>{orderId ? <Link href="/profile/orders" className="mt-3 inline-flex text-xs font-black text-lime">查看订单 {orderId.slice(0, 8)} →</Link> : null}</div> : null}
    </section>
  );
}
