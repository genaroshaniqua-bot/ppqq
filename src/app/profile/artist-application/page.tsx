import { AccountBackendPanel } from "@/components/profile/AccountBackendPanel";

export default function ArtistApplicationPage() {
  return <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8"><header className="mb-6"><p className="text-xs font-black uppercase text-purple">Artist onboarding</p><h1 className="mt-2 font-display text-4xl font-black">画师实名入驻</h1><p className="mt-2 text-sm font-semibold text-muted">依次完成协议确认、实名核验和能力资料审核。三项全部通过后，画师工作台才会开放。</p></header><AccountBackendPanel section="artist" /></div>;
}
