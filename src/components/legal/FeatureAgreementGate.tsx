"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, LoaderCircle, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { legalDocuments, legalSlugByDatabaseType, type LegalDocumentType } from "@/data/legal-documents";

type DatabaseDocumentType = keyof typeof legalSlugByDatabaseType;

type ActiveDocument = {
  id: string;
  document_type: DatabaseDocumentType;
  version: string;
  title: string;
  effective_at: string;
};

const baselineDocuments: DatabaseDocumentType[] = ["terms", "privacy"];

function requiredDocuments(pathname: string) {
  const required = [...baselineDocuments];
  if (
    pathname === "/artist" ||
    pathname.startsWith("/artist/") ||
    pathname.startsWith("/profile/artist-application")
  ) {
    required.push("creator_agreement");
  }
  if (
    pathname === "/create" ||
    pathname === "/studio" ||
    pathname.startsWith("/artist/portfolio") ||
    pathname.startsWith("/artist/products")
  ) {
    required.push("content_rules");
  }
  if (
    pathname === "/studio" ||
    pathname.startsWith("/artist/portfolio") ||
    pathname.startsWith("/artist/products")
  ) {
    required.push("copyright");
  }
  return [...new Set(required)];
}

export function FeatureAgreementGate() {
  const pathname = usePathname();
  const [queue, setQueue] = useState<ActiveDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const bypass = pathname === "/login" || pathname === "/trust" || pathname.startsWith("/legal/");
  const required = useMemo(() => requiredDocuments(pathname), [pathname]);

  const load = useCallback(async () => {
    if (bypass) {
      setQueue([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setQueue([]);
      setLoading(false);
      return;
    }

    const { data: documents, error: documentsError } = await supabase
      .from("legal_documents")
      .select("id, document_type, version, title, effective_at")
      .in("document_type", required)
      .eq("is_active", true);
    if (documentsError) {
      setError("协议状态暂时无法读取，请稍后重试。");
      setLoading(false);
      return;
    }

    const activeDocuments = (documents ?? []) as ActiveDocument[];
    if (activeDocuments.length === 0) {
      setQueue([]);
      setLoading(false);
      return;
    }

    const { data: consents, error: consentsError } = await supabase
      .from("legal_consents")
      .select("document_id, withdrawn_at")
      .in("document_id", activeDocuments.map((document) => document.id));
    if (consentsError) {
      setError("协议确认记录暂时无法读取，请稍后重试。");
      setLoading(false);
      return;
    }

    const accepted = new Set((consents ?? []).filter((consent) => !consent.withdrawn_at).map((consent) => consent.document_id));
    setQueue(
      required
        .map((type) => activeDocuments.find((document) => document.document_type === type))
        .filter((document): document is ActiveDocument => Boolean(document && !accepted.has(document.id)))
    );
    setLoading(false);
  }, [bypass, required]);

  useEffect(() => { void load(); }, [load]);

  const current = queue[0];
  if (bypass) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-[80] grid place-items-center bg-white/72 p-4 backdrop-blur-sm" aria-live="polite">
        <div className="flex items-center gap-3 rounded-pill border border-line bg-white px-5 py-3 text-sm font-black shadow-soft">
          <LoaderCircle size={17} className="animate-spin text-primary" />正在核对协议版本
        </div>
      </div>
    );
  }

  if (error && !current) {
    return (
      <div className="fixed inset-0 z-[80] grid place-items-center bg-ink/28 p-4 backdrop-blur-[2px]">
        <section role="alertdialog" aria-modal="true" className="w-full max-w-[420px] rounded-[24px] border border-line bg-white p-5 shadow-[0_28px_80px_rgba(18,16,22,0.24)]">
          <h2 className="text-lg font-black">暂时无法核对协议</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-muted">{error} 为避免未确认即使用，本页面暂不开放操作。</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link href="/trust" className="inline-flex min-h-11 items-center justify-center rounded-pill border border-line text-sm font-black text-muted">前往信任中心</Link>
            <button type="button" onClick={() => void load()} className="min-h-11 rounded-pill bg-ink text-sm font-black text-white">重新检查</button>
          </div>
        </section>
      </div>
    );
  }

  if (!current) return null;

  const slug = legalSlugByDatabaseType[current.document_type] as LegalDocumentType;
  const content = legalDocuments[slug];

  async function accept() {
    setSaving(true);
    setError("");
    const { error: acceptError } = await createSupabaseBrowserClient()
      .rpc("accept_legal_document", { target_document_id: current.id });
    setSaving(false);
    if (acceptError) {
      setError(`确认记录保存失败：${acceptError.message}`);
      return;
    }
    setQueue((items) => items.slice(1));
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-ink/28 p-4 backdrop-blur-[2px]" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="feature-agreement-title"
        className="w-full max-w-[480px] overflow-hidden rounded-[24px] border border-line bg-white shadow-[0_28px_80px_rgba(18,16,22,0.24)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-lime"><FileText size={17} /></span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">使用前确认</p>
              <h2 id="feature-agreement-title" className="truncate text-lg font-black">{current.title}</h2>
            </div>
          </div>
          <Link href="/trust" aria-label="暂不确认并离开当前功能" className="grid size-9 shrink-0 place-items-center rounded-full bg-bg text-muted hover:text-ink">
            <X size={17} />
          </Link>
        </header>

        <div className="max-h-[42vh] overflow-y-auto px-5 py-4 text-sm font-semibold leading-7 text-muted">
          <p className="font-black text-ink">{content.summary}</p>
          {content.sections.map((section) => (
            <section key={section.title} className="mt-4">
              <h3 className="text-sm font-black text-ink">{section.title}</h3>
              {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-2">{paragraph}</p>)}
            </section>
          ))}
        </div>

        <footer className="border-t border-line bg-bg/70 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-muted">
            <span>版本 {current.version} · {new Date(current.effective_at).toLocaleDateString("zh-CN")}</span>
            <Link href={`/legal/${slug}`} target="_blank" className="font-black text-primary underline">阅读完整协议</Link>
          </div>
          {error ? <p role="alert" className="mt-3 text-xs font-bold text-danger">{error}</p> : null}
          <div className="mt-4 grid grid-cols-[0.78fr_1.22fr] gap-3">
            <Link href="/trust" className="inline-flex min-h-11 items-center justify-center rounded-pill border border-line bg-white text-sm font-black text-muted">
              暂不同意
            </Link>
            <button
              type="button"
              disabled={saving}
              onClick={accept}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-pill bg-ink px-4 text-sm font-black text-white disabled:opacity-60"
            >
              {saving ? <LoaderCircle size={15} className="animate-spin" /> : null}
              同意并继续
            </button>
          </div>
          {queue.length > 1 ? <p className="mt-3 text-center text-[10px] font-bold text-muted">完成后还有 {queue.length - 1} 份当前功能所需协议</p> : null}
        </footer>
      </section>
    </div>
  );
}
