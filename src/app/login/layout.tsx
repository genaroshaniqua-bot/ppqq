import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WEIMING | 登录创作工作台",
  description: "登录 WEIMING，继续管理角色卡、剧情片段、商品订单和委托记录。"
};

export default function LoginLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
