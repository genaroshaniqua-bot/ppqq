import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generationRequestSchema } from "@/lib/ai/contracts";
import { aiEnabled, AI_MODEL, AiFailure, generateAi, publicAiError } from "@/lib/ai/server";

export const runtime = "nodejs";
export const maxDuration = 60;
const headers = { "Cache-Control": "no-store" };
// Best-effort burst protection within a function instance. Provider quotas remain authoritative.
const active = new Set<string>();
const cooldowns = new Map<string, number>();

export async function POST(request: Request) {
  let userId: string | undefined;
  let acquired = false;
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin) {
      throw new AiFailure(403, "invalid_origin", "请从网站页面发起生成。");
    }
    if (!request.headers.get("content-type")?.startsWith("application/json")) {
      throw new AiFailure(415, "invalid_content_type", "请求格式不正确。");
    }
    if (!aiEnabled()) throw new AiFailure(503, "ai_disabled", "AI 免费试用尚未开启，可先使用模板演示。");
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new AiFailure(401, "unauthorized", "请先登录后再生成。");
    userId = user.id;
    const { data: profile, error: profileError } = await supabase.from("profiles").select("account_status").eq("id", user.id).single();
    if (profileError) throw new AiFailure(503, "account_lookup_failed", "暂时无法核对账户状态。");
    if (profile.account_status !== "active") throw new AiFailure(403, "account_unavailable", "当前账户无法使用 AI。");

    const required = ["terms", "privacy", "content_rules", "copyright"];
    const { data: documents, error: documentError } = await supabase.from("legal_documents").select("id, document_type").in("document_type", required).eq("is_active", true);
    if (documentError || required.some((type) => !documents?.some((item) => item.document_type === type))) {
      throw new AiFailure(503, "agreements_unavailable", "必要协议暂不可用，请稍后重试。");
    }
    const { data: consents, error: consentError } = await supabase.from("legal_consents").select("document_id").eq("user_id", user.id).is("withdrawn_at", null).in("document_id", documents!.map((item) => item.id));
    if (consentError) throw new AiFailure(503, "consent_lookup_failed", "暂时无法核对协议确认记录。");
    if (documents!.some((item) => !consents?.some((consent) => consent.document_id === item.id))) {
      throw new AiFailure(403, "agreements_required", "请先阅读并确认当前创作功能协议。");
    }

    // Bound streamed request size even when Content-Length is absent or forged.
    const reader = request.body?.getReader();
    if (!reader) throw new AiFailure(400, "invalid_request", "请填写创作内容。");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 40000) { await reader.cancel(); throw new AiFailure(413, "request_too_large", "创作内容过长，请精简后重试。"); }
      chunks.push(value);
    }
    let raw: unknown;
    try { raw = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { throw new AiFailure(400, "invalid_request", "请求格式不正确。"); }
    const parsed = generationRequestSchema.safeParse(raw);
    if (!parsed.success) throw new AiFailure(400, "invalid_input", "请检查创作内容：灵感最多1200字，世界观和补充设定各最多800字。");
    const input = parsed.data;
    if (input.kind !== "character" && input.characterId) {
      const { data: character, error } = await supabase.from("characters").select("id").eq("id", input.characterId).eq("owner_id", user.id).maybeSingle();
      if (error || !character) throw new AiFailure(403, "character_unavailable", "无法读取当前账户的角色。");
    }
    const now = Date.now();
    for (const [id, until] of cooldowns) if (until <= now) cooldowns.delete(id);
    if (active.has(user.id) || (cooldowns.get(user.id) ?? 0) > now) throw new AiFailure(429, "rate_limited", "请等待当前生成完成，稍后再试。");
    active.add(user.id); cooldowns.set(user.id, now + 15000); acquired = true;
    const result = await generateAi(input, request.signal);
    let generationId: string | null = null;
    let warning: string | null = null;
    try {
      const { data: record, error: saveError } = await supabase.from("ai_generations").insert({
        owner_id: user.id, character_id: input.kind !== "character" ? input.characterId ?? null : null,
        generation_type: input.kind, prompt: { ...input, mode: "ai", model: AI_MODEL },
        result, status: "succeeded"
      }).select("id").single();
      if (saveError || !record) throw new Error("History unavailable");
      generationId = record.id;
    } catch {
      warning = "生成成功，但云端历史保存失败，请复制结果或保存角色。";
    }
    return NextResponse.json({ ...result, generationId, model: AI_MODEL, warning }, { headers });
  } catch (error) {
    const failure = publicAiError(error);
    return NextResponse.json({ error: failure.code, message: failure.message }, { status: failure.status, headers: { ...headers, ...(failure.status === 429 ? { "Retry-After": "15" } : {}) } });
  } finally {
    if (acquired && userId) active.delete(userId);
  }
}
