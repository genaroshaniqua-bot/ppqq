import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileCheck2 } from "lucide-react";
import { LEGAL_VERSION, legalDocuments, type LegalDocumentType } from "@/data/legal-documents";

export function generateStaticParams() {
  return Object.keys(legalDocuments).map((slug) => ({ slug }));
}

export default async function LegalDocumentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const document = legalDocuments[slug as LegalDocumentType];
  if (!document) notFound();

  return (
    <div className="bg-bg py-8 sm:py-12">
      <article className="mx-auto max-w-4xl px-4 sm:px-6">
        <Link href="/trust" className="inline-flex min-h-11 items-center gap-2 rounded-pill bg-white px-4 text-sm font-black shadow-soft">
          <ArrowLeft size={16} />返回信任中心
        </Link>
        <header className="mt-5 rounded-card bg-ink p-7 text-white shadow-soft sm:p-10">
          <div className="flex items-center gap-3 text-lime"><FileCheck2 size={20} /><p className="text-xs font-black uppercase tracking-[0.18em]">{document.eyebrow}</p></div>
          <h1 className="mt-4 font-display text-4xl font-black sm:text-5xl">{document.title}</h1>
          <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/70">{document.summary}</p>
          <p className="mt-5 text-xs font-bold text-white/45">版本 {LEGAL_VERSION} · 生效日期 2026 年 7 月 28 日 · 律师复核前产品准备稿</p>
        </header>
        <div className="mt-5 space-y-4">
          {document.sections.map((section) => (
            <section key={section.title} className="rounded-card border border-line bg-white p-6 shadow-soft sm:p-8">
              <h2 className="font-display text-2xl font-black">{section.title}</h2>
              <div className="mt-4 space-y-3 text-sm font-semibold leading-7 text-muted">
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
