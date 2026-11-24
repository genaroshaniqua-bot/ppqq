import type { GenerationRequest } from "./contracts";
import type { Character, CharacterContinuation } from "@/types/character";

export type AiResult = {
  character?: Character; continuation?: CharacterContinuation; lines?: string[];
  generationId: string | null; model: string; warning: string | null;
};

export async function requestAi(body: GenerationRequest): Promise<AiResult> {
  const response = await fetch("/api/ai/generate", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), signal: AbortSignal.timeout(60000)
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || (!data.character && !data.continuation && !data.lines)) {
    throw new Error(data?.message ?? (response.status === 401 ? "登录已失效，请重新登录。" : "AI 服务暂时不可用，请稍后重试。"));
  }
  return data;
}
