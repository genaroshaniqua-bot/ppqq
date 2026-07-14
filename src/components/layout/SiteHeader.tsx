"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Brush, Crown, LayoutDashboard, LogIn, Search, ShieldCheck, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand/BrandMark";
import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { NotificationBadge } from "@/components/notifications/NotificationBadge";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { useRoleWorkspace } from "@/components/auth/RoleWorkspaceProvider";

const marketplaceNavItems = [
  { href: "/home", label: "首页" },
  { href: "/commissions", label: "约稿" },
  { href: "/market", label: "商店" },
  { href: "/create", label: "发布需求" },
  { href: "/studio", label: "创作功能" },
  { href: "/pricing", label: "定价" }
];

const artistNavItems = [
  { href: "/artist", label: "画师工作台" },
  { href: "/artist/commissions", label: "委托管理" },
  { href: "/artist/products", label: "商品经营" },
  { href: "/artist/portfolio", label: "作品集" },
  { href: "/studio", label: "创作功能" }
];

const adminNavItems = [
  { href: "/admin", label: "管理总览" },
  { href: "/admin/users", label: "用户权限" },
  { href: "/admin/services", label: "服务审核" },
  { href: "/admin/disputes", label: "委托争议" },
  { href: "/admin/shop", label: "商品订单" },
  { href: "/admin/audit", label: "审计" }
];

const profileNavItems = [
  { href: "/profile/commissions", label: "我的委托" },
  { href: "/profile/orders", label: "商品订单" },
  { href: "/profile/addresses", label: "收货地址" },
  { href: "/profile/notifications", label: "消息通知" }
];

export function SiteHeader() {
  const pathname = usePathname();
  const { accountRole, displayName, avatarUrl, workspace, artistWorkspaceAvailable } = useRoleWorkspace();
  const isAdminArea = pathname.startsWith("/admin");
  const isAdminContext = isAdminArea || accountRole === "admin";
  const isArtistArea = pathname === "/artist" || pathname.startsWith("/artist/");
  const navItems = isAdminContext
    ? adminNavItems
    : isArtistArea || (workspace === "artist" && artistWorkspaceAvailable)
      ? artistNavItems
      : marketplaceNavItems;

  if (pathname === "/login") return null;

  if (pathname.startsWith("/profile")) {
    return (
      <header className="profile-header fixed inset-x-0 top-0 z-40 border-b border-white/70 bg-white/78 backdrop-blur-2xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/home" className="flex min-h-11 items-center gap-3 rounded-pill pr-2">
            <BrandMark className="h-12 w-11 drop-shadow-[0_10px_18px_rgba(18,16,22,0.14)]" />
            <span className="leading-tight">
              <BrandWordmark className="text-[1.55rem]" />
              <span className="hidden text-xs font-bold text-muted sm:block">原创角色共创与约稿平台</span>
            </span>
          </Link>

          <nav aria-label="主导航" className="ml-auto hidden items-center rounded-pill border border-line/70 bg-white/88 p-1 shadow-soft md:flex">
            {(workspace === "artist" && artistWorkspaceAvailable ? artistNavItems.slice(0, 4) : profileNavItems).map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "min-h-11 rounded-pill px-4 py-3 text-sm font-black text-muted transition hover:bg-bg hover:text-ink",
                    active && "bg-ink text-white shadow-[0_10px_24px_rgba(18,16,22,0.16)] hover:bg-ink hover:text-white"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            {accountRole === "admin" ? (
              <Link href="/admin" className="hidden min-h-11 items-center gap-2 rounded-pill bg-lime px-4 text-xs font-black text-ink sm:inline-flex">
                <ShieldCheck size={16} aria-hidden="true" />管理台
              </Link>
            ) : null}
            <Link href="/login" className="hidden size-11 place-items-center rounded-pill border border-line/70 bg-white text-ink shadow-soft transition hover:bg-primary/15 sm:grid" aria-label="打开登录界面">
              <LogIn size={19} aria-hidden="true" />
            </Link>
            <Link href="/profile" className="grid size-11 place-items-center rounded-full bg-ink text-white shadow-soft" aria-label="打开我的" aria-current="page">
              <UserAvatar src={avatarUrl} name={displayName} className="size-11" />
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="marketplace-header fixed inset-x-0 top-0 z-40 border-b border-white/70 bg-white/80 text-[#171722] shadow-[0_10px_32px_rgba(35,50,95,0.1)] backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-[1440px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/home" className="flex min-h-12 items-center gap-3 rounded-pill focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink">
          <BrandMark className="h-12 w-10 drop-shadow-[0_10px_18px_rgba(18,16,22,0.12)]" />
          <span className="hidden leading-none sm:block">
            <BrandWordmark className="text-[1.6rem]" />
            <span className="mt-1.5 block font-mono text-[7px] font-bold tracking-[0.26em] text-[#171722]/34">OC CREATIVE PLATFORM</span>
          </span>
        </Link>

        <nav aria-label="主导航" className="hidden items-stretch gap-7 self-stretch md:flex lg:gap-9">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex min-h-11 items-center text-sm font-black text-[#171722]/62 transition hover:text-[#171722] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171722]",
                  active && "text-[#171722] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-pill after:bg-lime"
                )}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden min-h-12 flex-1 max-w-md items-center gap-3 rounded-pill border border-line bg-white/72 px-4 text-muted lg:flex">
          <Search size={18} aria-hidden="true" />
          <span className="text-xs font-bold">搜索画师、标签或服务</span>
        </div>
        <Link
          href="/profile"
          className="hidden min-h-12 items-center justify-center gap-2 rounded-pill border border-line bg-white/72 px-4 text-sm font-black text-[#6f6870] transition hover:border-primary hover:bg-white hover:text-[#171722] md:inline-flex"
        >
          {isAdminContext ? <ShieldCheck size={20} aria-hidden="true" /> : isArtistArea || (workspace === "artist" && artistWorkspaceAvailable) ? <Brush size={20} aria-hidden="true" /> : <Crown size={20} aria-hidden="true" />}
          {isAdminContext ? "管理员" : isArtistArea || (workspace === "artist" && artistWorkspaceAvailable) ? "画师身份" : "个人身份"}
        </Link>
        <Link
          href="/profile/notifications"
          className="relative hidden size-12 place-items-center rounded-pill border border-line bg-white/72 text-[#6f6870] transition hover:border-primary hover:bg-white hover:text-[#171722] md:grid"
          aria-label="查看通知"
        >
          <Bell size={21} aria-hidden="true" />
          <NotificationBadge />
        </Link>
        <Link
          href="/profile"
          className="hidden size-12 place-items-center rounded-full shadow-soft transition hover:scale-[1.03] md:grid"
          aria-label="打开用户中心并更改头像"
        >
          <UserAvatar src={avatarUrl} name={displayName} className="size-12 ring-2 ring-white" />
        </Link>
        {accountRole === "admin" ? (
          <Link href="/admin" className="hidden min-h-12 items-center justify-center gap-2 rounded-pill bg-ink px-5 text-xs font-black text-white xl:inline-flex">
            <ShieldCheck size={16} aria-hidden="true" />管理工作台
          </Link>
        ) : workspace === "artist" && artistWorkspaceAvailable ? (
          <Link href="/artist" className="hidden min-h-12 items-center justify-center gap-2 rounded-pill bg-lime px-5 text-xs font-black text-[#171722] xl:inline-flex">
            <LayoutDashboard size={16} aria-hidden="true" />画师工作台
          </Link>
        ) : (
          <Link href="/profile" className="hidden min-h-12 items-center justify-center gap-2 rounded-pill bg-lime px-5 text-xs font-black text-[#171722] xl:inline-flex">
            <UserRound size={16} aria-hidden="true" />切换身份
          </Link>
        )}
        <Link href="/profile" className="ml-auto grid size-12 place-items-center rounded-pill border border-line bg-white/72 md:hidden" aria-label="打开用户中心">
          <UserRound size={21} aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
