"use client";

import { useEffect, useState } from "react";
import { Bell, Heart, LoaderCircle, MapPin, ReceiptText, UserRound } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ProfileBackendStats({ characterCount }: { characterCount: number }) {
  const [values, setValues] = useState({ orders: 0, commissions: 0, addresses: 0, unread: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    Promise.all([
      supabase.from("shop_orders").select("id", { count: "exact", head: true }),
      supabase.from("commission_requests").select("id", { count: "exact", head: true }),
      supabase.from("user_addresses").select("id", { count: "exact", head: true }),
      supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null)
    ]).then(([orders, commissions, addresses, unread]) => {
      setValues({ orders: orders.count ?? 0, commissions: commissions.count ?? 0, addresses: addresses.count ?? 0, unread: unread.count ?? 0 });
      setLoading(false);
    });
  }, []);

  const stats = [
    { label: "已保存角色", value: characterCount, icon: UserRound },
    { label: "商品订单", value: values.orders, icon: ReceiptText },
    { label: "委托记录", value: values.commissions, icon: Heart },
    { label: "收货地址", value: values.addresses, icon: MapPin },
    { label: "未读通知", value: values.unread, icon: Bell }
  ];

  return <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{stats.map((stat) => { const Icon = stat.icon; return <article key={stat.label} className="rounded-card border border-line bg-white p-5 shadow-soft"><Icon className="text-primary" size={23} aria-hidden="true" /><p className="mt-5 text-sm font-bold text-muted">{stat.label}</p><p className="mt-1 font-display text-3xl font-black">{loading ? <LoaderCircle size={22} className="animate-spin" /> : stat.value}</p></article>; })}</section>;
}
