"use client";

import Image from "next/image";
import { useState } from "react";

export function MaterialImage({ src, title, large = false, dark = false, small = false }: { src: string; title: string; large?: boolean; dark?: boolean; small?: boolean }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <div role="status" className="flex h-full items-center justify-center p-5 text-center text-sm text-ink/75">图片暂时无法加载，请刷新重试。</div>
  ) : small ? (
    <div className="absolute inset-0 flex items-center justify-center"><Image src={src} alt={title} width={64} height={76} unoptimized className="h-20 w-16 object-contain" onError={() => setFailed(true)} /></div>
  ) : (
    <Image src={src} alt={title} fill unoptimized sizes={large ? "(max-width: 768px) 100vw, 60vw" : "(max-width: 640px) 50vw, 25vw"} className={`object-contain p-3 ${dark ? "bg-purple" : ""}`} onError={() => setFailed(true)} />
  );
}
