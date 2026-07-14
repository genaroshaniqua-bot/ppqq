"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function NotificationBadge({ compact = false }: { compact?: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      const { count: unread } = await createSupabaseBrowserClient().from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
      if (active) setCount(unread ?? 0);
    }
    load();
    const refresh = () => load();
    window.addEventListener("notification-read", refresh);
    window.addEventListener("focus", refresh);
    return () => { active = false; window.removeEventListener("notification-read", refresh); window.removeEventListener("focus", refresh); };
  }, []);

  if (compact) return <>{count > 99 ? "99+" : count}</>;
  if (count === 0) return null;
  return <span className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-pill bg-pink text-xs font-black text-white shadow-soft">{count > 99 ? "99+" : count}</span>;
}

