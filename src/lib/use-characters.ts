"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { readCharacters } from "@/lib/storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Character } from "@/types/character";

export function useCharacters() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const version = useRef(0);
  const invalidate = useCallback(() => { version.current++; }, []);
  const refresh = useCallback(async () => {
    const request = ++version.current;
    setLoading(true); setError("");
    try {
      const rows = await readCharacters();
      if (request === version.current) setCharacters(rows);
    } catch (cause) {
      if (request === version.current) {
        setCharacters([]);
        setError(cause instanceof Error ? cause.message : "角色库暂时无法读取。");
      }
    } finally {
      if (request === version.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const sync = () => { void refresh(); };
    const { data: { subscription } } = createSupabaseBrowserClient().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") { ++version.current; setCharacters([]); setLoading(false); }
    });
    window.addEventListener("characters-updated", sync);
    window.addEventListener("focus", sync);
    return () => {
      invalidate(); subscription.unsubscribe();
      window.removeEventListener("characters-updated", sync);
      window.removeEventListener("focus", sync);
    };
  }, [refresh, invalidate]);
  return { characters, loading, error, refresh };
}
