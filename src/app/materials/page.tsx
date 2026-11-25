import { Suspense } from "react";
import type { Metadata } from "next";
import { MaterialLibrary } from "@/components/materials/MaterialLibrary";

export const metadata: Metadata = { title: "开放素材库 | WEIMING", description: "检索头像、海报底图、场景背景、表情贴纸与装饰纹样，查看来源与授权，下载后继续创作。" };

export default function MaterialsPage() {
  return <Suspense fallback={<p role="status" className="p-10 text-center">正在加载素材库…</p>}><MaterialLibrary /></Suspense>;
}
