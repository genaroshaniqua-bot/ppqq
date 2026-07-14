import { Images } from "lucide-react";
import { PortfolioManager } from "@/components/artist/PortfolioManager";

export default function ArtistPortfolioPage() {
  return <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><section className="mb-7 rounded-[36px] bg-ink p-6 text-white shadow-soft sm:p-8"><span className="inline-flex min-h-10 items-center gap-2 rounded-pill bg-lime px-4 text-xs font-black text-ink"><Images size={16} />画师工作区</span><h1 className="mt-5 font-display text-4xl font-black sm:text-6xl">公开作品集</h1><p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/62">整理最能代表画风和服务范围的作品，让委托人在下单前确认风格匹配。</p></section><PortfolioManager /></div>;
}
