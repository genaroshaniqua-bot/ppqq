"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function SignOutButton({ compact = false, className }: { compact?: boolean; className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function confirmSignOut() {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          compact
            ? "hidden size-11 place-items-center rounded-pill border border-line/70 bg-white text-ink shadow-soft transition hover:bg-primary/15 sm:grid"
            : "inline-flex min-h-11 items-center justify-center gap-2 rounded-pill border border-line bg-white px-5 py-3 text-sm font-black text-ink transition hover:bg-bg",
          className
        )}
        aria-label={compact ? "退出登录" : undefined}
      >
        <LogOut size={compact ? 19 : 16} aria-hidden="true" />
        {!compact ? "退出登录" : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-ink/55 px-4 backdrop-blur-sm" role="presentation" onMouseDown={() => !loading && setOpen(false)}>
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="sign-out-title"
            aria-describedby="sign-out-description"
            className="relative w-full max-w-sm rounded-[28px] border border-white/70 bg-white p-6 text-ink shadow-[0_28px_90px_rgba(18,16,22,0.28)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" disabled={loading} onClick={() => setOpen(false)} className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-bg text-muted hover:text-ink" aria-label="关闭退出确认">
              <X size={18} aria-hidden="true" />
            </button>
            <span className="grid size-12 place-items-center rounded-full bg-danger/10 text-danger"><LogOut size={21} aria-hidden="true" /></span>
            <h2 id="sign-out-title" className="mt-5 font-display text-2xl font-black">确定退出登录？</h2>
            <p id="sign-out-description" className="mt-2 text-sm font-semibold leading-6 text-muted">退出后需要重新输入账号密码才能继续管理角色、订单和委托。</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" disabled={loading} onClick={() => setOpen(false)} className="min-h-11 rounded-pill border border-line bg-white text-sm font-black hover:bg-bg">继续使用</button>
              <button type="button" disabled={loading} onClick={confirmSignOut} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-pill bg-ink text-sm font-black text-white disabled:opacity-60">
                {loading ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <LogOut size={16} aria-hidden="true" />}
                {loading ? "正在退出" : "确认退出"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
