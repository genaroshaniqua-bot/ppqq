"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { CheckCircle2, LoaderCircle, LockKeyhole } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");

    if (password.length < 10) {
      setSubmitting(false);
      setMessage("新密码至少需要 10 位字符。");
      return;
    }
    if (password !== confirmation) {
      setSubmitting(false);
      setMessage("两次输入的密码不一致。");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      setMessage("重置链接无效或已经过期，请重新申请密码重置邮件。");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      setMessage(error.message);
      return;
    }

    setComplete(true);
    setMessage("密码已更新。请使用新密码重新登录。");
    await supabase.auth.signOut();
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4 py-10">
      <section className="w-full max-w-md rounded-[28px] border border-line bg-white p-6 shadow-soft sm:p-8">
        <div className="flex items-center gap-3">
          <BrandMark className="size-12" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Secure account</p>
            <h1 className="font-display text-2xl font-black text-ink">设置新密码</h1>
          </div>
        </div>

        {!complete ? (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-sm font-black text-ink" htmlFor="new-password">新密码</label>
            <div className="flex h-12 items-center gap-3 rounded-[15px] border border-line bg-bg px-4 focus-within:border-primary">
              <LockKeyhole size={17} className="text-muted" />
              <input id="new-password" name="password" type="password" autoComplete="new-password" required minLength={10} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />
            </div>
            <label className="block text-sm font-black text-ink" htmlFor="confirm-password">再次输入</label>
            <div className="flex h-12 items-center gap-3 rounded-[15px] border border-line bg-bg px-4 focus-within:border-primary">
              <LockKeyhole size={17} className="text-muted" />
              <input id="confirm-password" name="confirmation" type="password" autoComplete="new-password" required minLength={10} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />
            </div>
            <button type="submit" disabled={submitting} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-ink text-sm font-black text-white hover:bg-primary disabled:opacity-55">
              {submitting ? <LoaderCircle size={17} className="animate-spin" /> : <LockKeyhole size={17} />}
              更新密码
            </button>
          </form>
        ) : (
          <div className="mt-6 rounded-[18px] bg-primary/10 p-5 text-primary">
            <CheckCircle2 size={24} />
            <p className="mt-3 text-sm font-black">{message}</p>
          </div>
        )}

        {!complete && message ? <p role="alert" className="mt-4 rounded-[14px] bg-danger/10 px-4 py-3 text-sm font-bold text-danger">{message}</p> : null}
        <Link href="/login" className="mt-6 inline-flex text-sm font-black text-ink hover:text-primary">
          返回登录
        </Link>
      </section>
    </main>
  );
}
