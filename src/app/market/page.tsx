"use client";

import { useMemo, useState } from "react";
import { Heart, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { marketProducts } from "@/data/mock-platform";
import { cn } from "@/lib/utils";
import type { MarketProduct, ProductKind } from "@/types/platform";

const kinds: Array<ProductKind | "全部"> = ["全部", "数字商品", "实体周边预览"];

export default function MarketPage() {
  const [kind, setKind] = useState<ProductKind | "全部">("全部");
  const [selected, setSelected] = useState<MarketProduct>(marketProducts[0]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [cart, setCart] = useState<string[]>([]);
  const [toast, setToast] = useState("");

  const filtered = useMemo(() => marketProducts.filter((product) => kind === "全部" || product.kind === kind), [kind]);

  function toggleWishlist(id: string) {
    setWishlist((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
    setToast("愿望单状态已更新");
  }

  function addCart(id: string) {
    setCart((current) => (current.includes(id) ? current : [...current, id]));
    setToast("已加入前端购物车演示");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-7 grid gap-5 rounded-[36px] border border-line bg-white p-6 shadow-soft md:grid-cols-[1fr_auto] md:p-8">
        <div>
          <p className="text-xs font-black uppercase text-primary">Market</p>
          <h1 className="mt-2 font-display text-4xl font-black md:text-6xl">逛商品</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
            浏览数字商品和实体周边预览。愿望单与购物车当前只做前端演示，不产生真实订单或支付。
          </p>
        </div>
        <div className="flex items-end">
          <div className="rounded-card bg-bg px-4 py-3 text-sm font-black text-muted">
            购物车演示：{cart.length} 件
          </div>
        </div>
      </section>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {kinds.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setKind(item)}
            className={cn(
              "min-h-11 shrink-0 rounded-pill px-4 text-sm font-black transition",
              kind === item ? "bg-ink text-white" : "bg-white text-muted shadow-soft hover:bg-primary/15 hover:text-ink"
            )}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.58fr_0.42fr]">
        <section className="grid gap-4 sm:grid-cols-2">
          {filtered.map((product) => (
            <article key={product.id} className="rounded-card border border-line bg-white p-5 shadow-soft">
              <div className="mb-5 flex items-start justify-between">
                <button
                  type="button"
                  onClick={() => setSelected(product)}
                  className="grid size-16 place-items-center rounded-card text-ink"
                  style={{ backgroundColor: product.accent }}
                  aria-label={`查看 ${product.title}`}
                >
                  <ShoppingBag size={25} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleWishlist(product.id)}
                  className={cn("grid size-11 place-items-center rounded-pill bg-bg text-muted", wishlist.includes(product.id) && "bg-pink text-white")}
                  aria-label={`${wishlist.includes(product.id) ? "移出" : "加入"}愿望单`}
                >
                  <Heart size={18} fill={wishlist.includes(product.id) ? "currentColor" : "none"} aria-hidden="true" />
                </button>
              </div>
              <p className="text-xs font-black text-primary">{product.kind} · {product.category}</p>
              <h2 className="mt-2 font-display text-2xl font-black">{product.title}</h2>
              <p className="mt-2 text-sm font-bold text-muted">{product.creator}</p>
              <p className="mt-3 text-sm leading-6 text-muted">{product.desc}</p>
              <div className="mt-5 flex items-center justify-between">
                <span className="font-display text-2xl font-black">¥{product.price}</span>
                <Button type="button" variant="secondary" onClick={() => addCart(product.id)}>
                  加入演示购物车
                </Button>
              </div>
            </article>
          ))}
        </section>

        <aside className="h-fit rounded-card border border-line bg-white p-5 shadow-soft lg:sticky lg:top-24">
          <p className="text-xs font-black uppercase text-primary">Product Detail</p>
          <h2 className="mt-2 font-display text-3xl font-black">{selected.title}</h2>
          <p className="mt-2 text-sm font-bold text-muted">{selected.creator} · {selected.currency}</p>
          <p className="mt-4 text-sm leading-7 text-muted">{selected.desc}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {selected.tags.map((tag) => (
              <span key={tag} className="rounded-pill bg-bg px-3 py-1 text-xs font-black text-muted">
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-6 rounded-card bg-bg p-4">
            <h3 className="text-sm font-black">包含内容</h3>
            <ul className="mt-3 space-y-2 text-sm font-semibold text-muted">
              {selected.includes.map((item) => (
                <li key={item}>· {item}</li>
              ))}
            </ul>
          </div>
          <p className="mt-5 rounded-card bg-lime/35 p-4 text-sm font-black text-ink">{selected.status}，当前不接真实支付。</p>
        </aside>
      </div>

      <Toast message={toast} />
    </div>
  );
}
