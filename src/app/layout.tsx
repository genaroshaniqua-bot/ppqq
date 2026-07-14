import type { Metadata } from "next";
import "./globals.css";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { RoleWorkspaceProvider } from "@/components/auth/RoleWorkspaceProvider";

export const metadata: Metadata = {
  title: "WEIMING | 原创角色共创与约稿平台",
  description: "发现 OC 头像、立绘、Live2D、表情包、摊宣和周边图案服务，比较报价、档期、授权与评价。",
  icons: {
    icon: "/brand/weimingshe-mark.png"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <RoleWorkspaceProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-pill focus:bg-ink focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
          >
            跳到主要内容
          </a>
          <SiteHeader />
          <main id="main-content" className="min-h-dvh pb-24 pt-20 md:pb-0">
            {children}
          </main>
          <MobileBottomNav />
        </RoleWorkspaceProvider>
      </body>
    </html>
  );
}
