import type { SupabaseClient } from "@supabase/supabase-js";

const fallbackImage = "/images/lobby-posters/poster-01.jpg";

export function portfolioObjectPath(reference: string) {
  if (!reference) return "";
  const marker = "/portfolios/";
  const markerIndex = reference.indexOf(marker);
  const rawPath = markerIndex >= 0 ? reference.slice(markerIndex + marker.length) : reference;
  return decodeURIComponent(rawPath.split("?")[0]);
}

export async function signPortfolioImage(
  supabase: SupabaseClient,
  reference: string,
  expiresIn = 3600
) {
  const path = portfolioObjectPath(reference);
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from("portfolios")
    .createSignedUrl(path, expiresIn);
  return error ? null : data.signedUrl;
}

export async function resolvePortfolioImage(
  supabase: SupabaseClient,
  reference: string,
  fallback = fallbackImage
) {
  return (await signPortfolioImage(supabase, reference)) ?? fallback;
}

export async function resolveProductCover(
  supabase: SupabaseClient,
  reference: string | null
) {
  if (!reference) return null;
  if (!reference.includes("/portfolios/")) return reference;
  return signPortfolioImage(supabase, reference);
}

export const lockedPortfolioPreview = fallbackImage;
