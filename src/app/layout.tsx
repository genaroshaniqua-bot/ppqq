import type { Metadata } from "next";
import "./globals.css";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = {
  title: "AI OC Studio | 二次元 OC 创作工具平台",
  description: "从角色灵感生成 OC 设定、角色卡、头像方向、同人片段、摊宣文案和周边预览方案。",
  icons: {
    icon: "/favicon.ico"
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
      </body>
    </html>
  );
}
