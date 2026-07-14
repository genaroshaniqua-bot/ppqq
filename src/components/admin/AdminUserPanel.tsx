"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LoaderCircle, Search, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AccountRole } from "@/lib/auth/roles";

type ManagedUser = {
  id: string;
  display_name: string;
  role: AccountRole;
  account_status: "active" | "suspended";
  created_at: string;
};

export function AdminUserPanel() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [query, setQuery] = useState("");
  const [reason, setReason] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, Pick<ManagedUser, "role" | "account_status">>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const [{ data: auth }, { data, error }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("profiles").select("id, display_name, role, account_status, created_at").order("created_at", { ascending: false })
    ]);
    if (error) throw error;
    const rows = (data ?? []) as ManagedUser[];
    setCurrentUserId(auth.user?.id ?? "");
    setUsers(rows);
    setDrafts(Object.fromEntries(rows.map((user) => [user.id, { role: user.role, account_status: user.account_status }])));
    setLoading(false);
  }, []);

  useEffect(() => {
    load().catch((error) => {
      setMessage(error instanceof Error ? error.message : "用户数据加载失败");
      setLoading(false);
    });
  }, [load]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return users.filter((user) => !keyword || user.display_name.toLowerCase().includes(keyword) || user.id.toLowerCase().includes(keyword));
  }, [query, users]);

  async function saveUser(user: ManagedUser) {
    const draft = drafts[user.id];
    const changeReason = reason[user.id]?.trim() ?? "";
    if (!draft || changeReason.length < 4) {
      setMessage("修改用户权限或状态时，请填写至少 4 个字的原因。");
      return;
    }
    setSaving(user.id); setMessage("");
    const { error } = await createSupabaseBrowserClient().rpc("admin_manage_user", {
      target_user_id: user.id,
      next_role: draft.role,
      next_status: draft.account_status,
      change_reason: changeReason
    });
    setSaving("");
    if (error) { setMessage(error.message); return; }
    setReason((current) => ({ ...current, [user.id]: "" }));
    setMessage(`已更新用户「${user.display_name}」并写入审计记录。`);
    await load();
  }

  if (loading) return <div className="grid min-h-52 place-items-center"><LoaderCircle className="animate-spin text-primary" /></div>;

  return (
    <section>
      <div className="flex flex-col gap-4 rounded-card border border-line bg-white p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Identity governance</p>
          <h1 className="mt-2 font-display text-3xl font-black">用户与权限</h1>
          <p className="mt-2 text-sm font-semibold text-muted">调整账户角色或暂停状态，每次操作都必须填写原因。</p>
        </div>
        <label className="flex min-h-12 min-w-72 items-center gap-3 rounded-pill bg-bg px-4">
          <Search size={17} className="text-muted" aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索昵称或用户 ID" className="w-full bg-transparent text-sm font-bold outline-none" />
        </label>
      </div>

      {message ? <p role="status" className="mt-5 rounded-pill bg-ink px-5 py-3 text-center text-sm font-black text-white">{message}</p> : null}

      <div className="mt-5 space-y-3">
        {filtered.map((user) => {
          const draft = drafts[user.id] ?? { role: user.role, account_status: user.account_status };
          const self = user.id === currentUserId;
          return (
            <article key={user.id} className="grid gap-4 rounded-card border border-line bg-white p-5 shadow-soft lg:grid-cols-[minmax(220px,1fr)_180px_180px_minmax(220px,1fr)_auto] lg:items-end">
              <div>
                <div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-full bg-primary/12 text-primary"><UserRound size={17} /></span><h2 className="font-display text-lg font-black">{user.display_name}</h2>{self ? <span className="rounded-pill bg-lime px-2 py-1 text-[10px] font-black">当前管理员</span> : null}</div>
                <p className="mt-2 truncate text-xs font-semibold text-muted">{user.id}</p>
                <p className="mt-1 text-xs font-semibold text-muted">注册于 {new Date(user.created_at).toLocaleString("zh-CN")}</p>
              </div>
              <label className="text-xs font-black text-muted">账户角色<select disabled={self} value={draft.role} onChange={(event) => setDrafts((current) => ({ ...current, [user.id]: { ...draft, role: event.target.value as AccountRole } }))} className="mt-2 h-11 w-full rounded-[14px] border border-line bg-bg px-3 text-sm font-black text-ink disabled:opacity-50"><option value="user">个人用户</option><option value="artist">画师</option><option value="admin">管理员</option></select></label>
              <label className="text-xs font-black text-muted">账户状态<select disabled={self} value={draft.account_status} onChange={(event) => setDrafts((current) => ({ ...current, [user.id]: { ...draft, account_status: event.target.value as ManagedUser["account_status"] } }))} className="mt-2 h-11 w-full rounded-[14px] border border-line bg-bg px-3 text-sm font-black text-ink disabled:opacity-50"><option value="active">正常</option><option value="suspended">已暂停</option></select></label>
              <label className="text-xs font-black text-muted">变更原因<input disabled={self} value={reason[user.id] ?? ""} onChange={(event) => setReason((current) => ({ ...current, [user.id]: event.target.value }))} placeholder="例如：违规内容复核" className="mt-2 h-11 w-full rounded-[14px] border border-line bg-bg px-3 text-sm font-semibold text-ink outline-none focus:border-primary disabled:opacity-50" /></label>
              <Button type="button" disabled={self || saving === user.id} onClick={() => saveUser(user)}><ShieldCheck size={16} />保存</Button>
            </article>
          );
        })}
        {filtered.length === 0 ? <p className="rounded-card border border-dashed border-line bg-white p-8 text-center text-sm font-semibold text-muted">没有匹配的用户。</p> : null}
      </div>
    </section>
  );
}
