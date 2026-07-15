import { LoginAppearanceSettings } from "@/components/profile/LoginAppearanceSettings";

export default function ProfileAppearancePage() {
  return <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8"><header className="mb-2"><p className="text-xs font-black uppercase text-primary">Appearance</p><h1 className="mt-2 font-display text-4xl font-black">登录页外观</h1><p className="mt-2 text-sm font-semibold text-muted">选择登录背景，或使用自己的图片、动图和视频。</p></header><LoginAppearanceSettings /></div>;
}
