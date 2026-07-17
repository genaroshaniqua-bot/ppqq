"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Brush, LoaderCircle, LockKeyhole, Mail, UserRound } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { BrandWordmark } from "@/components/brand/BrandWordmark";
import {
  DEFAULT_LOGIN_APPEARANCE,
  readCustomLoginBackground,
  readLoginAppearance
} from "@/lib/login-appearance";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ROLE_WORKSPACE_STORAGE_KEY, type WorkspaceRole } from "@/lib/auth/roles";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_204221_5339e40b-e73d-4ab0-9c65-79c18c66fd50.mp4";

export function LoginHero() {
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [entryRole, setEntryRole] = useState<WorkspaceRole>("user");
  const [authMessage, setAuthMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [appearance, setAppearance] = useState(DEFAULT_LOGIN_APPEARANCE);
  const [customBackground, setCustomBackground] = useState<{ url: string; type: string } | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("reason") === "suspended") {
      setAuthMessage({ type: "error", text: "此账户已被管理员暂停，请联系平台处理。" });
    }
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSigningIn(true);
    setAuthMessage(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    try {
      const supabase = createSupabaseBrowserClient();

      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: email.split("@")[0] } }
        });
        if (error) throw error;

        if (!data.session) {
          setAuthMessage({ type: "success", text: "注册成功，请前往邮箱完成验证后登录。" });
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("登录状态未建立，请重试。");

      if (mode === "register" && entryRole === "artist") {
        await supabase.from("artist_profiles").upsert({
          user_id: user.id,
          review_status: "draft",
          availability: "open"
        }, { onConflict: "user_id" });
      }

      const [{ data: profile }, { data: artist }] = await Promise.all([
        supabase.from("profiles").select("role, account_status").eq("id", user.id).single(),
        supabase.from("artist_profiles").select("review_status").eq("user_id", user.id).maybeSingle()
      ]);

      if (profile?.account_status === "suspended") {
        await supabase.auth.signOut();
        throw new Error("此账户已被管理员暂停，请联系平台处理。");
      }

      const requestedNext = new URLSearchParams(window.location.search).get("next");
      const safeNext = requestedNext?.startsWith("/") && !requestedNext.startsWith("//") && !requestedNext.startsWith("/login")
        ? requestedNext
        : null;

      if (profile?.role === "admin") {
        window.localStorage.setItem(ROLE_WORKSPACE_STORAGE_KEY, "user");
        router.push(safeNext ?? "/admin");
      } else if (entryRole === "artist" && profile?.role === "artist" && artist?.review_status === "approved") {
        window.localStorage.setItem(ROLE_WORKSPACE_STORAGE_KEY, "artist");
        router.push(safeNext ?? "/artist");
      } else if (entryRole === "artist") {
        window.localStorage.setItem(ROLE_WORKSPACE_STORAGE_KEY, "user");
        router.push("/profile?apply=artist");
      } else {
        window.localStorage.setItem(ROLE_WORKSPACE_STORAGE_KEY, "user");
        router.push(safeNext ?? "/home");
      }
      router.refresh();
    } catch (error) {
      setAuthMessage({
        type: "error",
        text: error instanceof Error ? error.message : "认证失败，请稍后重试。"
      });
    } finally {
      setIsSigningIn(false);
    }
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
          <span className="grid size-14 shrink-0 place-items-center rounded-[16px] bg-white shadow-[0_14px_32px_rgba(0,0,0,0.24)]">
            <BrandMark className="h-12 w-11" />
          </span>
          <span className="leading-none">
            <BrandWordmark className="text-[1.8rem] text-white sm:text-[2rem]" />
            <span className="mt-2 block font-mono text-[8px] font-bold tracking-[0.24em] text-white/48">ORIGINAL CHARACTER PLATFORM</span>
          </span>
        </div>

        <div className="grid min-h-0 flex-1 items-end gap-8 pb-1 pt-8 md:grid-cols-[minmax(0,0.92fr)_minmax(320px,430px)] md:gap-12">
          <div className="self-center md:self-end md:pb-8">
            <p className="oc-kicker mb-3 text-[11px] font-black text-lime drop-shadow-[0_2px_10px_rgba(0,0,0,0.75)] animate-[fadeSlideUp_0.8s_ease_0.2s_both] sm:mb-4">
              AI 创作 · 角色资产 · 交易发现
            </p>
            <h1 className="oc-title max-w-3xl text-3xl font-black leading-[1.08] text-white drop-shadow-[0_8px_28px_rgba(0,0,0,0.72)] animate-[fadeSlideUp_0.8s_ease_0.4s_both] sm:text-4xl md:text-5xl lg:text-6xl">
              让未命名的想象，<br />
              拥有被世界记住的形状
            </h1>
            <p className="mt-4 hidden max-w-xl text-sm font-semibold leading-7 text-white/78 drop-shadow-[0_3px_16px_rgba(0,0,0,0.72)] animate-[fadeSlideUp_0.8s_ease_0.7s_both] sm:block md:text-base">
              登录后继续管理角色设定、剧情片段、商品订单和真实委托记录。
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

            <fieldset className="mb-5">
              <legend className="text-xs font-black text-white/72">本次使用身份</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {([
                  { role: "user" as const, label: "个人用户", desc: "创作与购买", icon: UserRound },
                  { role: "artist" as const, label: "画师", desc: "接单与经营", icon: Brush }
                ]).map((item) => {
                  const Icon = item.icon;
                  const selected = entryRole === item.role;
                  return (
                    <button
                      key={item.role}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setEntryRole(item.role)}
                      className={`flex min-h-16 items-center gap-3 rounded-[16px] border px-3 text-left transition ${
                        selected
                          ? "border-lime bg-lime text-black shadow-[0_12px_28px_rgba(184,255,38,0.16)]"
                          : "border-white/18 bg-white/[0.06] text-white hover:bg-white/10"
                      }`}
                    >
                      <span className={`grid size-9 shrink-0 place-items-center rounded-full ${selected ? "bg-black text-lime" : "bg-white/10"}`}>
                        <Icon size={17} aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block text-sm font-black">{item.label}</span>
                        <span className={`block text-[11px] font-bold ${selected ? "text-black/58" : "text-white/50"}`}>{item.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] font-semibold leading-5 text-white/48">
                管理员使用普通入口登录，系统会自动识别权限。
              </p>
            </fieldset>

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

            {authMessage ? (
              <p
                role="status"
                className={`mt-4 rounded-[14px] border px-3 py-2 text-xs font-bold leading-5 ${
                  authMessage.type === "error"
                    ? "border-red-300/35 bg-red-400/15 text-red-100"
                    : "border-lime/35 bg-lime/15 text-lime"
                }`}
              >
                {authMessage.text}
              </p>
            ) : null}

            <p className="mt-4 text-center text-xs text-white/50">使用邮箱和密码登录。首次注册可能需要完成邮箱验证。</p>
          </form>
        </div>
      </div>
    </section>
  );
}
