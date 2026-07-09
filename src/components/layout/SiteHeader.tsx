"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LogIn, Search, Sparkles, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/create", label: "创作" },
  { href: "/characters", label: "角色资产" },
  { href: "/market", label: "逛商品" },
  { href: "/commissions", label: "找创作者" },
  { href: "/chat", label: "角色互动" },
  { href: "/profile", label: "我的" }
];

export function SiteHeader() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/60 bg-white/62 shadow-[0_12px_36px_rgba(72,48,118,0.08)] backdrop-blur-2xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/home" className="flex min-h-11 items-center gap-3 rounded-pill pr-2">
          <span className="grid size-11 place-items-center rounded-pill bg-[linear-gradient(135deg,#9c7cf4,#f0a0d0)] text-white shadow-[0_14px_32px_rgba(156,124,244,0.24)]">
            <Sparkles size={22} aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-lg font-black tracking-[-0.01em]">AI OC Studio</span>
            <span className="hidden text-xs font-bold text-muted sm:block">角色资产创作平台</span>
          </span>
        </Link>

        <nav aria-label="主导航" className="ml-auto hidden items-center rounded-pill border border-white/70 bg-white/58 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_12px_30px_rgba(72,48,118,0.06)] backdrop-blur-xl lg:flex">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "min-h-11 rounded-pill px-4 py-3 text-sm font-black text-muted transition hover:bg-white/76 hover:text-ink",
                  active && "bg-[linear-gradient(135deg,#9c7cf4,#f0a0d0)] text-white shadow-[0_10px_24px_rgba(156,124,244,0.22)] hover:text-white"
                )}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Link
            href="/home"
            className="hidden size-11 place-items-center rounded-pill border border-white/70 bg-white/62 text-ink shadow-[0_10px_24px_rgba(72,48,118,0.08)] backdrop-blur-xl transition hover:bg-white sm:grid"
            aria-label="搜索灵感和模板"
          >
            <Search size={18} aria-hidden="true" />
          </Link>
          <Link
            href="/profile"
            className="hidden size-11 place-items-center rounded-pill border border-white/70 bg-white/62 text-ink shadow-[0_10px_24px_rgba(72,48,118,0.08)] backdrop-blur-xl transition hover:bg-white sm:grid"
            aria-label="查看通知"
          >
            <Bell size={18} aria-hidden="true" />
          </Link>
          <Link
            href="/login"
            className={cn(
              "hidden size-11 place-items-center rounded-pill border border-white/70 bg-white/62 text-ink shadow-[0_10px_24px_rgba(72,48,118,0.08)] backdrop-blur-xl transition hover:bg-white sm:grid",
              pathname === "/login" && "bg-ink text-white hover:bg-ink"
            )}
            aria-label="打开登录界面"
          >
            <LogIn size={19} aria-hidden="true" />
          </Link>
          <Link
            href="/profile"
            className={cn(
              "grid size-11 place-items-center rounded-pill border border-white/70 bg-white/62 text-ink shadow-[0_10px_24px_rgba(72,48,118,0.08)] backdrop-blur-xl transition hover:bg-white",
              pathname === "/profile" && "bg-[linear-gradient(135deg,#9c7cf4,#f0a0d0)] text-white hover:text-white"
            )}
            aria-label="打开我的"
          >
            <UserRound size={20} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}
