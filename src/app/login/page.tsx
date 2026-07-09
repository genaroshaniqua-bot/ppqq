"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Loader2, LogIn, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  function submitDemo() {
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setToast(mode === "login" ? "已完成 mock 登录" : "已创建 mock 注册入口");
    }, 720);
  }

  return (
    <div className="-mt-20 min-h-dvh overflow-hidden bg-ink text-white">
      <div className="absolute inset-0">
        <video
          className="hidden size-full object-cover opacity-70 motion-safe:block"
          autoPlay
          muted
          loop
          playsInline
          poster="/images/hero-workbench.png"
          aria-hidden="true"
        />
        <div className="login-video-fallback absolute inset-0" aria-hidden="true" />
        <div className="absolute inset-0 bg-ink/55" aria-hidden="true" />
      </div>

      <main className="relative z-10 mx-auto grid min-h-dvh max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_420px] lg:items-center lg:px-8">
        <section className="flex min-h-[42dvh] flex-col justify-between py-4 lg:min-h-[72dvh]">
          <Link href="/" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-pill bg-white/12 px-4 text-sm font-black text-white backdrop-blur transition hover:bg-white/20">
            <ArrowLeft size={17} aria-hidden="true" />
            返回平台
          </Link>

          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-pill bg-lime px-3 py-1 text-xs font-black text-ink">
              <Sparkles size={14} aria-hidden="true" />
              AI OC Studio
            </span>
            <h1 className="mt-5 font-display text-4xl font-black leading-tight sm:text-6xl lg:text-7xl">进入你的角色资产宇宙</h1>
            <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-white/78">
              登录界面主视觉预留 6-8 秒无缝循环动态背景视频。当前使用静态 fallback 与动效底层，后续替换为真实视频素材。
            </p>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/20 bg-white/92 p-5 text-ink shadow-soft backdrop-blur-xl sm:p-6">
          <div className="mb-5 grid grid-cols-2 rounded-pill bg-bg p-1">
            {(["login", "register"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={`min-h-11 rounded-pill text-sm font-black transition ${mode === item ? "bg-ink text-white" : "text-muted hover:bg-white"}`}
              >
                {item === "login" ? "登录" : "注册"}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-black">邮箱</span>
              <input
                type="email"
                className="mt-2 min-h-12 w-full rounded-pill border border-line bg-bg px-4 text-base outline-none focus:border-primary"
                placeholder="creator@example.com"
              />
            </label>
            <label className="block">
              <span className="text-sm font-black">密码</span>
              <input
                type="password"
                className="mt-2 min-h-12 w-full rounded-pill border border-line bg-bg px-4 text-base outline-none focus:border-primary"
                placeholder="输入演示密码"
              />
            </label>

            <Button type="button" className="w-full" onClick={submitDemo} disabled={loading}>
              {loading ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <LogIn size={18} aria-hidden="true" />}
              {mode === "login" ? "进入我的平台" : "创建演示账号"}
            </Button>
          </div>

          <p className="mt-5 rounded-card bg-lime/35 p-4 text-sm font-bold leading-6 text-ink">
            当前不接真实认证、云端账户或支付能力。这里用于演示未来账户入口。
          </p>
        </section>
      </main>

      <Toast message={toast} />
    </div>
  );
}
