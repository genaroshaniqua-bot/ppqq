import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ArtistLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: artist }] = await Promise.all([
    supabase.from("profiles").select("role, account_status").eq("id", user.id).single(),
    supabase.from("artist_profiles").select("review_status").eq("user_id", user.id).maybeSingle()
  ]);

  if (profile?.account_status === "suspended") redirect("/login?reason=suspended");

  const canEnter = profile?.role === "artist" && artist?.review_status === "approved";

  if (!canEnter) redirect("/profile?apply=artist");

  return children;
}
