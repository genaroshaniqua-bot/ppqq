"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/create", label: "创作" },
  { href: "/characters", label: "角色库" },
  { href: "/booth", label: "摊宣工具" },
  { href: "/pricing", label: "定价" }
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-line/80 bg-bg/86 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-h-11 items-center gap-3 rounded-pill pr-2">
          <span className="grid size-11 place-items-center rounded-pill bg-ink text-lime shadow-soft">
            <Sparkles size={22} aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-lg font-black">AI OC Studio</span>
            <span className="hidden text-xs font-semibold text-muted sm:block">二次元创作工具台</span>
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

        <Link
          href="/profile"
          className={cn(
            "ml-auto grid size-11 place-items-center rounded-pill bg-white text-ink shadow-soft transition hover:bg-primary/15 md:ml-0",
            pathname === "/profile" && "bg-ink text-white hover:bg-ink"
          )}
          aria-label="打开用户中心"
        >
          <UserRound size={20} aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
