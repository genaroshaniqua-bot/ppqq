"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, MapPin, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { UserAddress } from "@/components/shop/AddressPanel";

export function AddressManager() {
  const [userId, setUserId] = useState("");
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from("user_addresses").select("id, label, recipient_name, phone, region, detail, is_default").order("is_default", { ascending: false }).order("created_at", { ascending: false });
    if (error) throw error;
    setUserId(user.id);
    setAddresses((data ?? []) as UserAddress[]);
    setLoading(false);
  }, []);

  useEffect(() => { load().catch((error) => { setMessage(error instanceof Error ? error.message : "地址加载失败"); setLoading(false); }); }, [load]);

  async function createAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSaving(true); setMessage("");
    const { error } = await createSupabaseBrowserClient().from("user_addresses").insert({
      user_id: userId,
      label: String(form.get("label") ?? "常用地址").trim(),
      recipient_name: String(form.get("recipient") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(),
      region: String(form.get("region") ?? "").trim(),
      detail: String(form.get("detail") ?? "").trim(),
      is_default: addresses.length === 0
    });
    setSaving(false);
    if (error) { setMessage(error.message); return; }
    formElement.reset(); setMessage("地址已保存"); await load();
  }

  async function setDefault(addressId: string) {
    setSaving(true); setMessage("");
    const supabase = createSupabaseBrowserClient();
    const { error: clearError } = await supabase.from("user_addresses").update({ is_default: false }).eq("user_id", userId);
    if (clearError) { setSaving(false); setMessage(clearError.message); return; }
    const { error } = await supabase.from("user_addresses").update({ is_default: true }).eq("id", addressId);
    setSaving(false);
    if (error) { setMessage(error.message); return; }
    setMessage("默认地址已更新"); await load();
  }

  async function removeAddress(address: UserAddress) {
    if (!window.confirm(`确认删除地址「${address.label}」吗？`)) return;
    setSaving(true); setMessage("");
    const { error } = await createSupabaseBrowserClient().from("user_addresses").delete().eq("id", address.id);
    setSaving(false);
    if (error) { setMessage(error.message); return; }
    setMessage("地址已删除"); await load();
  }

  if (loading) return <div className="grid min-h-48 place-items-center"><LoaderCircle className="animate-spin text-primary" /></div>;

  return (
    <section>
      {message ? <p role="status" className="mb-5 rounded-pill bg-ink px-5 py-3 text-center text-sm font-black text-white">{message}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {addresses.map((address) => (
          <article key={address.id} className={`rounded-card border p-5 shadow-soft ${address.is_default ? "border-blue bg-blue/5" : "border-line bg-white"}`}>
            <div className="flex items-start justify-between gap-3"><span className="grid size-11 place-items-center rounded-full bg-white text-blue"><MapPin size={19} /></span>{address.is_default ? <span className="inline-flex items-center gap-1 rounded-pill bg-blue px-3 py-1 text-xs font-black text-white"><CheckCircle2 size={13} />默认地址</span> : null}</div>
            <h2 className="mt-4 font-display text-xl font-black">{address.label} · {address.recipient_name}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-muted">{address.phone}<br />{address.region} {address.detail}</p>
            <div className="mt-4 flex gap-2">{!address.is_default ? <Button type="button" variant="secondary" disabled={saving} onClick={() => setDefault(address.id)}>设为默认</Button> : null}<Button type="button" variant="danger" disabled={saving} onClick={() => removeAddress(address)}><Trash2 size={15} />删除</Button></div>
          </article>
        ))}
        {addresses.length === 0 ? <p className="rounded-card border border-dashed border-line bg-white p-8 text-center text-sm font-semibold text-muted md:col-span-2">还没有保存地址。实体商品结算前需要先添加收货地址。</p> : null}
      </div>
      <form onSubmit={createAddress} className="mt-6 rounded-card border border-line bg-white p-5 shadow-soft">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-primary/12 text-primary"><Plus size={18} /></span><h2 className="font-display text-2xl font-black">添加收货地址</h2></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5"><input name="label" required placeholder="地址标签" defaultValue="常用地址" className="h-11 rounded-[14px] border border-line bg-bg px-3 text-sm font-semibold" /><input name="recipient" required placeholder="收货人" className="h-11 rounded-[14px] border border-line bg-bg px-3 text-sm font-semibold" /><input name="phone" required minLength={7} placeholder="联系电话" className="h-11 rounded-[14px] border border-line bg-bg px-3 text-sm font-semibold" /><input name="region" required placeholder="省 / 市 / 区" className="h-11 rounded-[14px] border border-line bg-bg px-3 text-sm font-semibold" /><input name="detail" required minLength={5} placeholder="详细地址" className="h-11 rounded-[14px] border border-line bg-bg px-3 text-sm font-semibold" /></div>
        <Button type="submit" disabled={saving} className="mt-4"><Plus size={15} />保存地址</Button>
      </form>
    </section>
  );
}
