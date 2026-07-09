"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, Sparkles, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/create", label: "创作" },
  { href: "/market", label: "逛商品" },
  { href: "/commissions", label: "找创作者" },
  { href: "/chat", label: "角色互动" }
];

export function SiteHeader() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-line/80 bg-bg/86 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-h-11 items-center gap-3 rounded-pill pr-2">
          <span className="grid size-11 place-items-center rounded-pill bg-ink text-lime shadow-soft">
            <Sparkles size={22} aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-lg font-black">AI OC Studio</span>
            <span className="hidden text-xs font-semibold text-muted sm:block">二次元 OC 综合平台</span>
          </span>
        </Link>

        <nav aria-label="主导航" className="ml-auto hidden items-center rounded-pill bg-white p-1 shadow-soft md:flex">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "min-h-11 rounded-pill px-4 py-3 text-sm font-bold text-muted transition hover:bg-bg hover:text-ink",
                  active && "bg-ink text-white hover:bg-ink hover:text-white"
                )}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Link
            href="/login"
            className={cn(
              "hidden size-11 place-items-center rounded-pill bg-white text-ink shadow-soft transition hover:bg-primary/15 sm:grid",
              pathname === "/login" && "bg-ink text-white hover:bg-ink"
            )}
            aria-label="打开登录界面"
          >
            <LogIn size={19} aria-hidden="true" />
          </Link>
          <Link
            href="/profile"
            className={cn(
              "grid size-11 place-items-center rounded-pill bg-white text-ink shadow-soft transition hover:bg-primary/15",
              pathname === "/profile" && "bg-ink text-white hover:bg-ink"
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
