import { AccountBackendPanel } from "@/components/profile/AccountBackendPanel";

export default function ArtistApplicationPage() {
  return <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8"><header className="mb-6"><p className="text-xs font-black uppercase text-purple">Artist onboarding</p><h1 className="mt-2 font-display text-4xl font-black">画师入驻</h1><p className="mt-2 text-sm font-semibold text-muted">填写服务定位和接单说明。审核通过后，画师工作台会自动开放。</p></header><AccountBackendPanel section="artist" /></div>;
}
