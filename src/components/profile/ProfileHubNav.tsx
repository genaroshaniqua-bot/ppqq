"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brush, LayoutDashboard, Palette, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/profile", label: "总览", icon: LayoutDashboard, exact: true },
  { href: "/profile/settings", label: "账户资料", icon: Settings2 },
  { href: "/profile/artist-application", label: "画师入驻", icon: Brush },
  { href: "/profile/appearance", label: "外观设置", icon: Palette }
];

export function ProfileHubNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="个人中心设置" className="mx-auto mt-5 flex max-w-7xl gap-2 overflow-x-auto px-4 pb-1 sm:px-6 lg:px-8">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-pill border px-4 text-sm font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              active ? "border-ink bg-ink text-white shadow-soft" : "border-line bg-white text-muted hover:border-primary hover:text-ink"
            )}
          >
            <Icon size={16} aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
