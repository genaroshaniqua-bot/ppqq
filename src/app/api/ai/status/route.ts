import { NextResponse } from "next/server";
import { aiEnabled, AI_MODEL_LABEL } from "@/lib/ai/server";

export function GET() {
  return NextResponse.json({ enabled: aiEnabled(), model: AI_MODEL_LABEL }, { headers: { "Cache-Control": "no-store" } });
}
