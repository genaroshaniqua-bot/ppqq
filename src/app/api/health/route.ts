import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const checkedAt = new Date().toISOString();

  try {
    const supabase = await createSupabaseServerClient();
    const startedAt = performance.now();
    const { error } = await supabase
      .from("legal_documents")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);
    const databaseLatencyMs = Math.round(performance.now() - startedAt);

    if (error) {
      return NextResponse.json(
        { status: "degraded", checkedAt, services: { application: "up", database: "down" } },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { status: "ok", checkedAt, services: { application: "up", database: "up" }, databaseLatencyMs },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { status: "down", checkedAt, services: { application: "up", database: "unknown" } },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
