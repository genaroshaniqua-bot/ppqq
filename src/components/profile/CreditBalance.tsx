"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function CreditBalance() {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase.from("profiles").select("point_balance").eq("id", data.user.id).single();
      setBalance(typeof profile?.point_balance === "number" ? profile.point_balance : 0);
    });
  }, []);

  return balance === null ? <LoaderCircle size={22} className="animate-spin" aria-label="正在加载点数余额" /> : <>{balance}</>;
}
