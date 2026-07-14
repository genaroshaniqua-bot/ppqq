import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "WEIMING | 我的平台资产",
  description: "管理角色资产、愿望单、订单、委托记录与登录页面背景设置。"
};

export default async function ProfileLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("account_status").eq("id", user.id).single();
  if (profile?.account_status === "suspended") redirect("/login?reason=suspended");
  return children;
}
