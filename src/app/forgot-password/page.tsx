"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, LoaderCircle, Mail } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    setSubmitting(false);
    if (error) {
      setMessage(error.message);
      return;
    }

    setSent(true);
    setMessage("如果该邮箱已注册，密码重置邮件将很快送达。请同时检查垃圾邮件。");
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4 py-10">
      <section className="w-full max-w-md rounded-[28px] border border-line bg-white p-6 shadow-soft sm:p-8">
        <div className="flex items-center gap-3">
          <BrandMark className="size-12" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Account recovery</p>
            <h1 className="font-display text-2xl font-black text-ink">找回密码</h1>
          </div>
        </div>
        <p className="mt-5 text-sm font-semibold leading-6 text-muted">
          输入注册邮箱，我们会发送一次性重置链接。链接失效后需要重新申请。
        </p>

        <form onSubmit={submit} className="mt-6">
          <label htmlFor="recovery-email" className="text-sm font-black text-ink">邮箱</label>
          <div className="mt-2 flex h-12 items-center gap-3 rounded-[15px] border border-line bg-bg px-4 focus-within:border-primary">
            <Mail size={17} className="text-muted" aria-hidden="true" />
            <input
              id="recovery-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={sent}
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none disabled:opacity-60"
              placeholder="name@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || sent}
            className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-ink px-5 text-sm font-black text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-55"
          >
            {submitting ? <LoaderCircle size={17} className="animate-spin" /> : <Mail size={17} />}
            {sent ? "重置邮件已申请" : "发送重置邮件"}
          </button>
        </form>

        {message ? (
          <p role="status" className={`mt-4 rounded-[14px] px-4 py-3 text-sm font-bold ${sent ? "bg-primary/10 text-primary" : "bg-danger/10 text-danger"}`}>
            {message}
          </p>
        ) : null}

        <Link href="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-black text-ink hover:text-primary">
          <ArrowLeft size={16} /> 返回登录
        </Link>
      </section>
    </main>
  );
}
