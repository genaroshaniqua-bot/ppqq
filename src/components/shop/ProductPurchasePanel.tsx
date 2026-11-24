"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ProductPurchasePanelProps = { product: { id: string; title: string; kind: "digital" | "physical" | "custom"; price: number; stock: number | null } };
export function ProductPurchasePanel({ product }: ProductPurchasePanelProps) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  async function addToCart() {
    setSaving(true); setMessage("");
    try {
      const client = createSupabaseBrowserClient();
      const { data, error: readError } = await client.rpc("get_my_cart");
      if (readError) throw readError;
      const current = (data as { product_id: string; quantity: number }[] | null)?.find(item => item.product_id === product.id)?.quantity ?? 0;
      const { error } = await client.rpc("set_cart_quantity", { target_product_id: product.id, target_quantity: current + 1 });
      if (error) throw error;
      setMessage("已加入购物车。当前暂未开放收款。");
    } catch { setMessage("加入购物车失败，请确认登录与库存后重试。"); }
    finally { setSaving(false); }
  }
  return <section className="rounded-[28px] border border-line bg-white p-5 shadow-soft sm:p-6">
    <h2 className="font-display text-2xl font-black">商品购买</h2>
    <p className="mt-4 font-display text-3xl font-black">¥{product.price}</p>
    <p className="mt-3 text-sm leading-6 text-muted">收款服务暂未开放，可先浏览或加入购物车。不会扣款，也不会生成已支付订单。</p>
    <div className="mt-5 flex flex-wrap gap-3"><Button disabled={saving || product.stock === 0} onClick={addToCart}>{saving ? "正在加入…" : product.stock === 0 ? "暂时缺货" : "加入购物车"}</Button><Button disabled variant="secondary">暂未开放支付</Button></div>
    {message ? <p role="status" className="mt-4 text-sm">{message}</p> : null}
  </section>;
}
