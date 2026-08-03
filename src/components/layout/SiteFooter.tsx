import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-8 text-sm sm:px-6 md:grid-cols-[1fr_auto] lg:px-8">
        <div>
          <p className="font-black text-ink">WEIMING · 未名原创角色平台</p>
          <p className="mt-2 max-w-2xl text-xs font-semibold leading-6 text-muted">真实支付暂未开放。画师须完成实名准入；主体资料、协议版本和合规复核记录在信任中心持续公示。</p>
        </div>
        <nav aria-label="法律与安全" className="flex flex-wrap items-start gap-x-5 gap-y-3 font-bold text-muted">
          <Link href="/support" className="hover:text-ink">客服中心</Link>
          <Link href="/trust" className="hover:text-ink">信任与安全</Link>
          <Link href="/legal/operator" className="hover:text-ink">经营主体信息</Link>
          <Link href="/legal/terms" className="hover:text-ink">用户协议</Link>
          <Link href="/legal/privacy" className="hover:text-ink">隐私政策</Link>
          <Link href="/legal/copyright" className="hover:text-ink">版权保护</Link>
        </nav>
      </div>
    </footer>
  );
}
