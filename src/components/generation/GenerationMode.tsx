"use client";

import { useEffect, useState } from "react";

export type GenerationMode = "template" | "ai";

export function GenerationModePicker({ value, onChange, disabled = false }: {
  value: GenerationMode; onChange: (value: GenerationMode) => void; disabled?: boolean;
}) {
  const [availability, setAvailability] = useState<"loading" | "ready" | "disabled" | "error">("loading");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/ai/status", { cache: "no-store", signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((data) => setAvailability(data.enabled ? "ready" : "disabled"))
      .catch(() => { if (!controller.signal.aborted) setAvailability("error"); });
    return () => controller.abort();
  }, [refresh]);
  return <fieldset disabled={disabled} className="rounded-[22px] border border-line bg-white p-4 text-ink">
    <legend className="px-2 text-sm font-black">生成方式</legend>
    <div className="flex flex-wrap gap-3">
      <button type="button" aria-pressed={value === "template"} onClick={() => onChange("template")} className={`min-h-11 rounded-pill px-4 text-sm font-black ${value === "template" ? "bg-ink text-white" : "bg-bg"}`}>模板演示</button>
      <button type="button" disabled={availability !== "ready"} aria-pressed={value === "ai"} onClick={() => onChange("ai")} className={`min-h-11 rounded-pill px-4 text-sm font-black disabled:opacity-50 ${value === "ai" ? "bg-ink text-white" : "bg-bg"}`}>真实 AI · 免费试用</button>
    </div>
    <p role="status" className="mt-3 text-sm leading-6 text-muted">{availability === "loading" ? "正在检查 AI 服务…" : availability === "error" ? "暂时无法检查 AI 状态。" : availability === "disabled" ? "AI 免费试用待启用，目前可用模板演示。" : value === "ai" ? "仅使用免费模型；额度不足或服务不可用时停止，不会转为付费调用。创作内容将发送给 Vercel AI Gateway 与 NVIDIA，服务商可能保留内容用于模型改进，请勿输入私密资料。" : "固定模板组合，不调用 AI。选择“真实 AI”可尝试新的角色设定和文本。"}</p>
    {(availability === "disabled" || availability === "error") && <button type="button" className="mt-1 min-h-11 text-sm font-bold underline" onClick={() => { setAvailability("loading"); setRefresh((n) => n + 1); }}>重新检查</button>}
  </fieldset>;
}
