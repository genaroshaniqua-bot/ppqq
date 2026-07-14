"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BadgeCheck, Brush, ImageUp, LoaderCircle, LogOut, Save, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRoleWorkspace } from "@/components/auth/RoleWorkspaceProvider";
import type { WorkspaceRole } from "@/lib/auth/roles";
import { UserAvatar } from "@/components/profile/UserAvatar";

type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  role: "user" | "artist" | "admin";
};

type ArtistProfile = {
  headline: string | null;
  introduction: string | null;
  review_status: "draft" | "pending" | "approved" | "rejected";
  availability: string;
};

const reviewLabels: Record<ArtistProfile["review_status"], string> = {
  draft: "尚未提交",
  pending: "等待管理员审核",
  approved: "已通过审核",
  rejected: "审核未通过"
};

export function AccountBackendPanel() {
  const router = useRouter();
  const { workspace, artistWorkspaceAvailable, switchWorkspace, refreshRole } = useRoleWorkspace();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [artist, setArtist] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const [{ data: profileData }, { data: artistData }] = await Promise.all([
        supabase.from("profiles").select("id, display_name, avatar_url, bio, role").eq("id", user.id).single(),
        supabase.from("artist_profiles").select("headline, introduction, review_status, availability").eq("user_id", user.id).maybeSingle()
      ]);

      if (active) {
        setProfile(profileData as Profile | null);
        setArtist(artistData as ArtistProfile | null);
        setLoading(false);
      }
    }

    loadAccount().catch((error) => {
      if (active) {
        setMessage(error instanceof Error ? error.message : "账户资料加载失败");
        setLoading(false);
      }
    });

    return () => { active = false; };
  }, [router]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: String(form.get("displayName") ?? "").trim(),
        bio: String(form.get("bio") ?? "").trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", profile.id);

    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setProfile({ ...profile, display_name: String(form.get("displayName") ?? "").trim(), bio: String(form.get("bio") ?? "").trim() || null });
    setMessage("个人资料已保存");
  }

  function selectAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage("请选择 JPG、PNG 或 WebP 图片。");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage("头像图片不能超过 5 MB。");
      event.target.value = "";
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setMessage("已选择新头像，确认预览后点击上传。");
  }

  async function uploadAvatar() {
    if (!profile || !avatarFile) return;
    setUploadingAvatar(true);
    setMessage("");
    const supabase = createSupabaseBrowserClient();
    const path = `${profile.id}/avatar`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, avatarFile, {
      upsert: true,
      cacheControl: "3600",
      contentType: avatarFile.type
    });

    if (uploadError) {
      setUploadingAvatar(false);
      setMessage(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const nextAvatarUrl = `${data.publicUrl}?v=${Date.now()}`;
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ avatar_url: nextAvatarUrl, updated_at: new Date().toISOString() })
      .eq("id", profile.id);

    setUploadingAvatar(false);
    if (profileError) {
      setMessage(profileError.message);
      return;
    }

    setProfile({ ...profile, avatar_url: nextAvatarUrl });
    setAvatarFile(null);
    setAvatarPreview("");
    setMessage("头像已更新，导航栏将同步显示新头像。");
    await refreshRole();
    router.refresh();
  }

  async function removeAvatar() {
    if (!profile?.avatar_url) return;
    setUploadingAvatar(true);
    setMessage("");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq("id", profile.id);

    if (error) {
      setUploadingAvatar(false);
      setMessage(error.message);
      return;
    }

    const marker = "/storage/v1/object/public/avatars/";
    const markerIndex = profile.avatar_url.indexOf(marker);
    const storedPath = markerIndex >= 0
      ? decodeURIComponent(profile.avatar_url.slice(markerIndex + marker.length).split("?")[0])
      : `${profile.id}/avatar`;
    await supabase.storage.from("avatars").remove([storedPath]);

    setUploadingAvatar(false);
    setProfile({ ...profile, avatar_url: null });
    setAvatarFile(null);
    setAvatarPreview("");
    setMessage("头像已移除，已恢复为名称首字母头像。");
    await refreshRole();
    router.refresh();
  }

  async function submitArtistApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      user_id: profile.id,
      headline: String(form.get("headline") ?? "").trim(),
      introduction: String(form.get("introduction") ?? "").trim(),
      review_status: "pending" as const,
      availability: "open"
    };
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("artist_profiles").upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setArtist(payload);
    setMessage("画师入驻申请已提交");
    await refreshRole();
  }

  function enterWorkspace(nextWorkspace: WorkspaceRole) {
    if (!switchWorkspace(nextWorkspace)) {
      setMessage("画师身份需要先提交入驻申请并通过管理员审核。");
      return;
    }
    router.push(nextWorkspace === "artist" ? "/artist" : "/home");
  }

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (loading) {
    return <section className="mb-8 flex min-h-40 items-center justify-center rounded-card border border-line bg-white shadow-soft"><LoaderCircle className="animate-spin text-primary" /></section>;
  }

  if (!profile) {
    return <section className="mb-8 rounded-card border border-danger/30 bg-danger/5 p-5 text-sm font-bold text-danger">{message || "没有找到用户资料，请重新登录。"}</section>;
  }

  return (
    <section className="mb-8 grid gap-6 lg:grid-cols-2">
      <article className="overflow-hidden rounded-[28px] border border-line bg-ink p-5 text-white shadow-soft sm:p-6 lg:col-span-2">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-lime">Workspace identity</p>
            <h2 className="mt-2 font-display text-2xl font-black">选择当前使用身份</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/62">
              同一个账户共享资料、资产与交易记录；切换后只改变工作台和导航，不改变真实账户权限。
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[470px]">
            {([
              { role: "user" as const, label: "个人用户", desc: "创作、购买、发起委托", icon: UserRound },
              { role: "artist" as const, label: "画师", desc: artistWorkspaceAvailable ? "接单、交付、经营商品" : "通过审核后开放", icon: Brush }
            ]).map((item) => {
              const Icon = item.icon;
              const selected = workspace === item.role;
              const disabled = item.role === "artist" && !artistWorkspaceAvailable;
              return (
                <button
                  key={item.role}
                  type="button"
                  disabled={disabled}
                  aria-pressed={selected}
                  onClick={() => enterWorkspace(item.role)}
                  className={`group flex min-h-20 items-center gap-3 rounded-[20px] border px-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime disabled:cursor-not-allowed disabled:opacity-45 ${
                    selected ? "border-lime bg-lime text-ink" : "border-white/14 bg-white/[0.07] hover:border-white/30 hover:bg-white/10"
                  }`}
                >
                  <span className={`grid size-11 shrink-0 place-items-center rounded-full ${selected ? "bg-ink text-lime" : "bg-white/10"}`}>
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black">{item.label}</span>
                    <span className={`mt-1 block text-xs font-semibold ${selected ? "text-ink/58" : "text-white/54"}`}>{item.desc}</span>
                  </span>
                  {!disabled ? <ArrowRight size={16} className="transition group-hover:translate-x-0.5" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      </article>

      <form onSubmit={saveProfile} className="rounded-card border border-line bg-white p-5 shadow-soft sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-primary">Supabase Account</p>
            <h2 className="mt-2 font-display text-2xl font-black">真实账户资料</h2>
          </div>
          <span className="inline-flex items-center gap-2 rounded-pill bg-primary/12 px-3 py-2 text-xs font-black text-primary">
            <BadgeCheck size={15} /> {profile.role === "admin" ? "管理员" : profile.role === "artist" ? "画师" : "用户"}
          </span>
        </div>
        <div className="mt-5 flex flex-col gap-4 rounded-[20px] border border-line bg-bg p-4 sm:flex-row sm:items-center">
          <UserAvatar src={avatarPreview || profile.avatar_url} name={profile.display_name} className="size-20 text-2xl ring-4 ring-white shadow-soft" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black">个人头像</p>
            <p className="mt-1 text-xs font-semibold text-muted">支持 JPG、PNG、WebP，最大 5 MB。建议使用正方形图片。</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <label htmlFor="profile-avatar" className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-pill bg-white px-4 py-2 text-xs font-black shadow-sm transition hover:bg-primary/10">
                <ImageUp size={15} aria-hidden="true" />选择图片
              </label>
              <input id="profile-avatar" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={selectAvatar} />
              {avatarFile ? (
                <button type="button" disabled={uploadingAvatar} onClick={uploadAvatar} className="inline-flex min-h-10 items-center gap-2 rounded-pill bg-ink px-4 py-2 text-xs font-black text-white disabled:opacity-50">
                  {uploadingAvatar ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <ImageUp size={15} aria-hidden="true" />}
                  上传头像
                </button>
              ) : null}
              {profile.avatar_url ? (
                <button type="button" disabled={uploadingAvatar} onClick={removeAvatar} className="inline-flex min-h-10 items-center gap-2 rounded-pill px-3 py-2 text-xs font-black text-danger transition hover:bg-danger/10 disabled:opacity-50">
                  <Trash2 size={15} aria-hidden="true" />移除
                </button>
              ) : null}
            </div>
          </div>
        </div>
        <label className="mt-5 block text-sm font-black" htmlFor="profile-display-name">显示名称</label>
        <input id="profile-display-name" name="displayName" required defaultValue={profile.display_name} className="mt-2 h-12 w-full rounded-[16px] border border-line bg-bg px-4 text-sm font-bold outline-none focus:border-primary" />
        <label className="mt-4 block text-sm font-black" htmlFor="profile-bio">个人简介</label>
        <textarea id="profile-bio" name="bio" defaultValue={profile.bio ?? ""} rows={4} className="mt-2 w-full rounded-[16px] border border-line bg-bg p-4 text-sm font-semibold outline-none focus:border-primary" />
        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="submit" disabled={saving}><Save size={16} />保存资料</Button>
          <Button type="button" variant="secondary" onClick={signOut}><LogOut size={16} />退出登录</Button>
          {profile.role === "admin" ? <Link href="/admin/artists" className="inline-flex min-h-11 items-center gap-2 rounded-pill bg-lime px-5 py-3 text-sm font-black text-ink"><ShieldCheck size={16} />画师审核</Link> : null}
        </div>
      </form>

      <form onSubmit={submitArtistApplication} className="rounded-card border border-line bg-white p-5 shadow-soft sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-purple">Artist Onboarding</p>
            <h2 className="mt-2 font-display text-2xl font-black">画师入驻</h2>
          </div>
          <span className="inline-flex items-center gap-2 rounded-pill bg-purple/12 px-3 py-2 text-xs font-black text-purple"><Brush size={15} />{artist ? reviewLabels[artist.review_status] : "尚未提交"}</span>
        </div>
        <label className="mt-5 block text-sm font-black" htmlFor="artist-headline">服务定位</label>
        <input id="artist-headline" name="headline" required defaultValue={artist?.headline ?? ""} placeholder="例如：日系厚涂 OC 立绘画师" className="mt-2 h-12 w-full rounded-[16px] border border-line bg-bg px-4 text-sm font-bold outline-none focus:border-purple" />
        <label className="mt-4 block text-sm font-black" htmlFor="artist-introduction">入驻介绍</label>
        <textarea id="artist-introduction" name="introduction" required minLength={20} defaultValue={artist?.introduction ?? ""} rows={4} placeholder="介绍你的画风、擅长内容、接单规则和经验。" className="mt-2 w-full rounded-[16px] border border-line bg-bg p-4 text-sm font-semibold outline-none focus:border-purple" />
        <Button type="submit" disabled={saving || artist?.review_status === "approved"} className="mt-5"><Brush size={16} />{artist ? "更新并重新提交" : "提交入驻申请"}</Button>
      </form>

      {message ? <p role="status" className="lg:col-span-2 rounded-pill bg-ink px-5 py-3 text-center text-sm font-black text-white">{message}</p> : null}
    </section>
  );
}
