"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, LockKeyhole, Mail, Sparkles } from "lucide-react";
import {
  DEFAULT_LOGIN_APPEARANCE,
  readCustomLoginBackground,
  readLoginAppearance
} from "@/lib/login-appearance";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_204221_5339e40b-e73d-4ab0-9c65-79c18c66fd50.mp4";

export function LoginHero() {
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [appearance, setAppearance] = useState(DEFAULT_LOGIN_APPEARANCE);
  const [customBackground, setCustomBackground] = useState<{ url: string; type: string } | null>(null);

  useEffect(() => {
    const savedAppearance = readLoginAppearance();
    if (savedAppearance !== "custom") {
      setAppearance(savedAppearance);
      return;
    }

    let objectUrl: string | null = null;
    readCustomLoginBackground()
      .then((background) => {
        if (!background) {
          setAppearance(DEFAULT_LOGIN_APPEARANCE);
          return;
        }
        objectUrl = URL.createObjectURL(background.blob);
        setCustomBackground({ url: objectUrl, type: background.type });
        setAppearance("custom");
      })
      .catch(() => setAppearance(DEFAULT_LOGIN_APPEARANCE));

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSigningIn(true);
    window.setTimeout(() => router.push("/home"), 700);
  }

  return (
    <section className="relative -mb-24 -mt-20 min-h-dvh w-full overflow-hidden bg-black font-sans text-white md:mb-0">
      {appearance === "custom" && customBackground ? (
        customBackground.type.startsWith("video/") ? (
          <video
            src={customBackground.url}
            autoPlay
            muted
            loop
            playsInline
            poster="/images/login-silver-twins.jpg"
            aria-hidden="true"
            className="absolute h-full w-full object-cover"
          />
        ) : (
          <div className="absolute -inset-[4%] animate-[loginImageDrift_18s_ease-in-out_infinite_alternate]">
            {/* A blob URL cannot use next/image optimization. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={customBackground.url} alt="" className="h-full w-full object-cover" />
          </div>
        )
      ) : appearance === "silver-twins" ? (
        <div className="absolute -inset-[4%] animate-[loginImageDrift_18s_ease-in-out_infinite_alternate]">
          <Image
            src="/images/login-silver-twins.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>
      ) : (
        <video
          autoPlay
          muted
          loop
          playsInline
          poster="/images/login-silver-twins.jpg"
          aria-hidden="true"
          className="absolute h-full w-full object-cover object-[70%_center]"
        >
          <source src={VIDEO_URL} type="video/mp4" />
        </video>
      )}

      <div className="absolute inset-0 bg-black/[0.52]" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/[0.92] via-black/[0.42] to-black/[0.58]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/[0.48] via-black/[0.12] to-black/[0.88]" />
      {appearance === "silver-twins" || (appearance === "custom" && customBackground && !customBackground.type.startsWith("video/")) ? (
        <div className="absolute inset-0 animate-[loginLightDrift_9s_ease-in-out_infinite_alternate] bg-[radial-gradient(circle_at_48%_24%,rgba(255,255,255,0.34),transparent_22%)] mix-blend-screen" />
      ) : null}

      <div className="relative z-10 flex min-h-dvh flex-col px-6 pb-8 pt-7 sm:px-8 sm:pb-10 md:px-12 md:pb-12 lg:px-16">
        <div className="flex items-center gap-3 animate-[fadeSlideUp_0.8s_ease_0.1s_both]">
          <span className="grid size-11 place-items-center rounded-full bg-white text-black shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
            <Sparkles size={20} aria-hidden="true" />
          </span>
          <span className="text-lg font-black tracking-[-0.01em] sm:text-xl">AI OC Studio</span>
        </div>

        <div className="grid min-h-0 flex-1 items-end gap-8 pb-1 pt-8 md:grid-cols-[minmax(0,1fr)_minmax(320px,430px)] md:gap-12">
          <div className="self-center md:self-end md:pb-4">
            <p className="oc-kicker mb-4 text-[11px] font-black text-lime drop-shadow-[0_2px_10px_rgba(0,0,0,0.75)] animate-[fadeSlideUp_0.8s_ease_0.2s_both] sm:mb-6">
              AI 创作 · 角色资产 · 交易发现
            </p>
            <h1 className="oc-title max-w-4xl text-4xl font-black leading-[1.02] text-white drop-shadow-[0_8px_28px_rgba(0,0,0,0.72)] animate-[fadeSlideUp_0.8s_ease_0.4s_both] sm:text-5xl md:text-6xl lg:text-7xl">
              塑造角色，
              <br />
              延展故事，
              <br />
              让每个 OC 真正鲜活。
            </h1>
            <p className="mt-5 hidden max-w-lg text-sm font-semibold leading-relaxed text-white/78 drop-shadow-[0_3px_16px_rgba(0,0,0,0.72)] animate-[fadeSlideUp_0.8s_ease_0.7s_both] sm:block md:text-base">
              登录后继续管理角色卡、剧情片段、愿望单、订单演示和委托记录。
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-[24px] border border-white/18 bg-black/[0.62] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.35)] backdrop-blur-2xl animate-[fadeSlideUp_0.8s_ease_0.6s_both] sm:p-6"
          >
            <div className="mb-5 grid grid-cols-2 rounded-[18px] bg-white/10 p-1">
              {(["login", "register"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={`h-11 rounded-[14px] text-sm font-black transition ${mode === item ? "bg-white text-black shadow-[0_12px_26px_rgba(0,0,0,0.18)]" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
                >
                  {item === "login" ? "登录" : "注册"}
                </button>
              ))}
            </div>

            <div className="mb-5">
              <p className="text-xs font-bold text-white/60">{mode === "login" ? "欢迎回来" : "创建演示账号"}</p>
              <h2 className="oc-title mt-1 text-2xl font-black">{mode === "login" ? "登录创作工作台" : "注册并进入平台"}</h2>
            </div>

            <label className="block text-xs font-black text-white/72" htmlFor="login-email">
              邮箱
            </label>
            <div className="mt-2 flex h-12 items-center gap-3 rounded-[14px] border border-white/20 bg-white/10 px-3 transition focus-within:border-white/70 focus-within:bg-white/14">
              <Mail size={17} className="text-white/55" aria-hidden="true" />
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="name@example.com"
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
              />
            </div>

            <label className="mt-4 block text-xs font-black text-white/72" htmlFor="login-password">
              密码
            </label>
            <div className="mt-2 flex h-12 items-center gap-3 rounded-[14px] border border-white/20 bg-white/10 px-3 transition focus-within:border-white/70 focus-within:bg-white/14">
              <LockKeyhole size={17} className="text-white/55" aria-hidden="true" />
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={6}
                placeholder="至少 6 位字符"
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
              />
            </div>

            <button
              type="submit"
              disabled={isSigningIn}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-white px-5 text-sm font-black text-black transition hover:scale-[1.01] hover:bg-lime disabled:cursor-wait disabled:opacity-70"
            >
              {isSigningIn ? (
                <>
                  <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                  正在进入
                </>
              ) : (
                <>
                  {mode === "login" ? "登录" : "注册"}
                  <ArrowRight size={16} aria-hidden="true" />
                </>
              )}
            </button>

            <p className="mt-4 text-center text-xs text-white/50">当前为前端演示，输入任意有效邮箱和至少 6 位密码即可继续。</p>
          </form>
        </div>
      </div>
    </section>
  );
}
