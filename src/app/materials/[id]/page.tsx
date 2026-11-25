import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDownToLine, ArrowLeft, ExternalLink } from "lucide-react";
import { materials } from "@/lib/materials";
import { MaterialImage } from "@/components/materials/MaterialImage";

export function generateStaticParams() { return materials.map(({ id }) => ({ id })); }

export default async function MaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = materials.find((value) => value.id === id);
  if (!item) notFound();
  return <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
    <Link href="/materials" className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold"><ArrowLeft size={17} aria-hidden="true" />返回素材库</Link>
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="relative min-h-72 overflow-hidden rounded-card border border-line bg-white lg:min-h-[620px]"><MaterialImage src={item.file} title={item.title} large dark={item.category === "装饰纹样"} small={item.category === "表情贴纸"} /></div>
      <section className="min-w-0 rounded-card border border-line bg-white p-6 sm:p-8">
        <span className="rounded-pill bg-bg px-3 py-2 text-xs font-bold">{item.category} · CC0</span>
        <h1 className="mt-5 text-3xl font-black leading-tight">{item.title}</h1>
        <p className="mt-3 text-sm leading-6 text-ink/70">{item.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">{item.tags.map((tag) => <Link key={tag} href={`/materials?tag=${encodeURIComponent(tag)}`} className="inline-flex min-h-11 items-center rounded-pill bg-bg px-3 text-xs font-semibold hover:bg-primary/15">#{tag}</Link>)}</div>
        <dl className="mt-6 grid grid-cols-[5rem_1fr] gap-x-3 gap-y-3 text-sm leading-6">
          <dt className="text-ink/65">作者</dt><dd>{item.author}</dd>
          <dt className="text-ink/65">原作名称</dt><dd className="break-words">{item.originalTitle}</dd>
          <dt className="text-ink/65">文件</dt><dd>WebP · {item.width} × {item.height} px · {Math.ceil(item.bytes / 1024)} KB</dd>
          <dt className="text-ink/65">处理说明</dt><dd>{item.modifications}</dd>
          <dt className="text-ink/65">收录日期</dt><dd>{item.collectedAt}</dd>
          <dt className="text-ink/65">素材编号</dt><dd>{item.id}</dd>
        </dl>
        <div className="mt-6 rounded-small bg-bg p-4 text-sm leading-7"><p className="font-bold">CC0 1.0 · 可复制、改编与商用</p><p className="mt-1 text-ink/75">无需强制署名。建议保留作者及来源，方便后续核查；不得暗示作者或馆方认可、赞助你的作品。</p><div className="mt-2 flex flex-wrap gap-x-4"><a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 font-bold underline">查看原始来源<ExternalLink size={13} aria-hidden="true" /></a><a href={item.licenseUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-bold underline">阅读许可证</a></div></div>
        <div className="mt-6 flex flex-wrap gap-3"><a href={item.file} download={`${item.id}.webp`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-pill bg-ink px-6 text-sm font-bold text-white hover:bg-purple"><ArrowDownToLine size={17} aria-hidden="true" />下载素材</a><a href={item.creditFile} download className="inline-flex min-h-12 items-center rounded-pill border border-line px-5 text-sm font-bold hover:bg-bg">下载来源说明</a></div>
        <p className="mt-4 text-xs leading-6 text-ink/70">{item.category === "海报底图" ? "这是公版插画底图，可用于海报排版；本文件未添加活动名称、价格或文案。" : "下载后可用于头像、角色设定展示或其他创作排版。"} 原尺寸文件可从原始来源获取。</p>
      </section>
    </div>
  </div>;
}
