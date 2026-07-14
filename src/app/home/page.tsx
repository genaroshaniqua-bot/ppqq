import { HomeDiscovery } from "@/components/discovery/HomeDiscovery";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProductHomePage() {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    return <HomeDiscovery />;
  }

  const session = (await cookies()).get("ai-oc-demo-session");

  if (session?.value !== "active") {
    redirect("/login");
  }

  return <HomeDiscovery />;
}
