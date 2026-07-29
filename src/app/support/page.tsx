import type { Metadata } from "next";
import { SupportCenter } from "@/components/support/SupportCenter";

export const metadata: Metadata = {
  title: "WEIMING | 客服中心",
  description: "提交并跟踪账户、约稿、商城和技术问题。"
};

export default function SupportPage() {
  return <SupportCenter />;
}
