import { generateText, Output } from "ai";
import { buildPrompt, characterContentSchema, continuationSchema, interactionSchema, SYSTEM_PROMPT, type GenerationRequest } from "./contracts";

// A fixed free model and provider: clients cannot select a paid model or fallback.
export const AI_MODEL = "nvidia/nemotron-3.5-lightning-free";
export const AI_PROVIDER = "nvidia";
export const AI_MODEL_LABEL = "Nemotron 3.5 Lightning Free";

export function aiEnabled() {
  return process.env.AI_TEXT_ENABLED === "true" && process.env.AI_FREE_ONLY_VERIFIED === "true";
}

export class AiFailure extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

// Check the exact provider's price on every call. Catalog errors fail closed.
export async function verifyFreeModel() {
  const response = await fetch(`https://ai-gateway.vercel.sh/v1/models/${AI_MODEL}/endpoints`, {
    cache: "no-store", signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new AiFailure(503, "price_unavailable", "暂时无法核对免费模型状态，请稍后重试。");
  const body = await response.json();
  const endpoints = body.data?.endpoints ?? body.endpoints;
  const endpoint = Array.isArray(endpoints) ? endpoints.find((item) => item.provider_name === AI_PROVIDER) : null;
  const pricing = endpoint?.pricing;
  if (!pricing || String(pricing.prompt) !== "0" || String(pricing.completion) !== "0"
    || Object.entries(pricing).some(([key, value]) => key !== "discount" && Number(value) !== 0)) {
    throw new AiFailure(503, "free_model_unavailable", "免费模型当前不可用，已停止调用，不会切换到付费模型。");
  }
}

export async function generateAi(request: GenerationRequest, signal: AbortSignal) {
  await verifyFreeModel();
  const settings = {
    model: AI_MODEL, system: SYSTEM_PROMPT, prompt: buildPrompt(request),
    maxOutputTokens: 2400, maxRetries: 0, reasoning: "none" as const,
    abortSignal: AbortSignal.any([signal, AbortSignal.timeout(45000)]),
    providerOptions: { gateway: { only: [AI_PROVIDER] } }
  };
  if (request.kind === "character") {
    const { output } = await generateText({ ...settings, output: Output.object({ schema: characterContentSchema }) });
    return { character: {
      ...output, style: request.input.style, type: request.input.type,
      id: crypto.randomUUID(), createdAt: new Date().toISOString(),
      color: "#54c5b7", imagePosition: "center"
    } };
  }
  if (request.kind === "interaction") {
    const { output } = await generateText({ ...settings, output: Output.object({ schema: interactionSchema }) });
    return { lines: output.lines };
  }
  const { output } = await generateText({ ...settings, output: Output.object({ schema: continuationSchema }) });
  return { continuation: output };
}

export function publicAiError(error: unknown): AiFailure {
  if (error instanceof AiFailure) return error;
  // SDKs may wrap upstream errors. Never return upstream bodies, credentials or prompts.
  let current = error;
  for (let i = 0; i < 5 && current && typeof current === "object"; i++) {
    const value = current as { statusCode?: number; name?: string; cause?: unknown };
    if (value.statusCode === 402) return new AiFailure(402, "free_quota_exhausted", "免费额度已用尽，AI 已暂停。不会自动充值或切换付费模型。");
    if (value.statusCode === 429) return new AiFailure(429, "rate_limited", "免费模型请求较多，请稍后再试。");
    if (value.statusCode === 401 || value.statusCode === 403) return new AiFailure(503, "provider_setup_required", "AI 服务尚未完成账户验证，请联系管理员。");
    if (value.name === "AbortError" || value.name === "TimeoutError") return new AiFailure(504, "generation_timeout", "生成超时，请稍后重试。不会自动重复提交。");
    current = value.cause;
  }
  return new AiFailure(502, "generation_failed", "AI 暂时未能生成完整结果，请稍后重试，或手动选择模板演示。");
}
