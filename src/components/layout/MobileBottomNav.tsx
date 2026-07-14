"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brush, Home, Images, LayoutDashboard, MessageCircle, ShieldCheck, ShoppingBag, Store, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRoleWorkspace } from "@/components/auth/RoleWorkspaceProvider";

const marketplaceItems = [
  { href: "/home", label: "首页", icon: Home },
  { href: "/create", label: "发布", icon: Brush },
  { href: "/market", label: "商店", icon: ShoppingBag },
  { href: "/commissions", label: "约稿", icon: Store },
  { href: "/chat", label: "消息", icon: MessageCircle },
  { href: "/profile", label: "我的", icon: UserRound }
];

const profileItems = [
  { href: "/home", label: "首页", icon: Home },
  { href: "/profile/commissions", label: "委托", icon: Store },
  { href: "/profile/orders", label: "订单", icon: ShoppingBag },
  { href: "/profile/addresses", label: "地址", icon: MessageCircle },
  { href: "/profile/notifications", label: "通知", icon: MessageCircle },
  { href: "/profile", label: "我的", icon: UserRound }
];

const artistItems = [
  { href: "/artist", label: "工作台", icon: LayoutDashboard },
  { href: "/artist/commissions", label: "委托", icon: Store },
  { href: "/artist/products", label: "商品", icon: ShoppingBag },
  { href: "/artist/portfolio", label: "作品", icon: Images },
  { href: "/studio", label: "创作", icon: Brush },
  { href: "/profile", label: "我的", icon: UserRound }
];

const adminItems = [
  { href: "/admin", label: "总览", icon: ShieldCheck },
  { href: "/admin/users", label: "用户", icon: UserRound },
  { href: "/admin/services", label: "服务", icon: Brush },
  { href: "/admin/disputes", label: "争议", icon: Store },
  { href: "/admin/shop", label: "订单", icon: ShoppingBag },
  { href: "/admin/audit", label: "审计", icon: MessageCircle }
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { accountRole, workspace, artistWorkspaceAvailable } = useRoleWorkspace();

  if (pathname === "/login") return null;

  const isProfile = pathname.startsWith("/profile");
  const isAdminArea = pathname.startsWith("/admin");
  const isArtistArea = pathname.startsWith("/artist");
  const baseItems = isAdminArea
    ? adminItems
    : isArtistArea || (workspace === "artist" && artistWorkspaceAvailable)
      ? artistItems
      : (isProfile ? profileItems : marketplaceItems);
  const items = accountRole === "admin" && workspace === "user" && !isAdminArea
    ? baseItems.map((item, index) => index === 1 ? { href: "/admin", label: "管理", icon: ShieldCheck } : item)
    : baseItems;

  return (
    <nav
      aria-label="移动端主导航"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-xl md:hidden",
        isProfile ? "profile-mobile-nav border-t border-line bg-white/92 shadow-[0_-12px_30px_rgba(12,9,13,0.08)]" : "marketplace-mobile-nav border-t border-white/70 bg-white/88 shadow-[0_-12px_30px_rgba(35,50,95,0.12)]"
      )}
    >
      <div className="mx-auto grid max-w-lg grid-cols-6 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-bold transition active:scale-[0.98]",
                isProfile ? "text-muted" : "text-muted",
                active && (isProfile ? "bg-ink text-white" : "bg-lime text-[#171722]")
              )}
            >
              <Icon size={19} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
