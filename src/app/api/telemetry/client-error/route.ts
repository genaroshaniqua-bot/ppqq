import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as null | {
    code?: string;
    message?: string;
    route?: string;
  };
  const code = String(body?.code ?? "client_runtime_error").replace(/[^a-z0-9_.-]/gi, "_").slice(0, 80);
  const message = String(body?.message ?? "Client runtime error").replace(/\s+/g, " ").trim().slice(0, 500);
  const route = String(body?.route ?? "").split("?")[0].slice(0, 300) || null;
  if (message.length < 3) return NextResponse.json({ error: "invalid event" }, { status: 400 });

  const { error } = await supabase.from("operations_events").insert({
    user_id: user.id,
    severity: "warning",
    source: "client",
    event_code: code,
    message,
    route,
    context: { userAgentFamily: request.headers.get("sec-ch-ua")?.slice(0, 200) ?? null }
  });

  return error
    ? NextResponse.json({ error: "event not recorded" }, { status: 503 })
    : NextResponse.json({ recorded: true }, { status: 202 });
}
