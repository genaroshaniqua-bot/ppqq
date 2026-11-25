import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { materials } from "@/lib/materials";
import { MaterialImage } from "./MaterialImage";

const featured = materials.slice(0, 6);

export function MaterialRail() {
  return <section aria-label="开放素材精选" className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold tracking-widest text-purple">CREATIVE RESOURCES</p><h2 className="mt-2 text-2xl font-black">你的创作素材补给站</h2><p className="mt-2 text-sm text-ink/70">100 份开放授权素材 · 头像、海报底图、背景与装饰</p></div><Link href="/materials" className="inline-flex min-h-11 items-center gap-2 rounded-pill bg-white px-5 text-sm font-bold hover:bg-primary/15">浏览全部素材<ArrowRight size={16} aria-hidden="true" /></Link></div>
    <div className="flex gap-4 overflow-x-auto pb-3">{featured.map((item) => <Link key={item.id} href={`/materials/${item.id}`} className="w-48 shrink-0 overflow-hidden rounded-card border border-line bg-white hover:border-purple sm:w-52"><div className="relative aspect-[4/3] bg-bg"><MaterialImage src={item.preview} title={item.title} dark={item.category === "装饰纹样"} small={item.category === "表情贴纸"} /></div><div className="p-4"><p className="text-xs text-purple">{item.category} · CC0</p><h3 className="mt-2 truncate text-sm font-bold">{item.title}</h3></div></Link>)}</div>
  </section>;
}
