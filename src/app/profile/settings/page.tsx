import { AccountBackendPanel } from "@/components/profile/AccountBackendPanel";

export default function ProfileSettingsPage() {
  return <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8"><header className="mb-6"><p className="text-xs font-black uppercase text-primary">Account</p><h1 className="mt-2 font-display text-4xl font-black">账户资料</h1><p className="mt-2 text-sm font-semibold text-muted">管理头像、显示名称、个人简介与当前工作身份。</p></header><AccountBackendPanel section="account" /></div>;
}
