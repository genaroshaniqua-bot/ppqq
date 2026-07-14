"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  canUseArtistWorkspace,
  getCapabilities,
  ROLE_WORKSPACE_STORAGE_KEY,
  type AccountRole,
  type ArtistReviewStatus,
  type Capability,
  type WorkspaceRole
} from "@/lib/auth/roles";

type RoleWorkspaceContextValue = {
  accountRole: AccountRole | null;
  displayName: string | null;
  avatarUrl: string | null;
  artistReviewStatus: ArtistReviewStatus | null;
  workspace: WorkspaceRole;
  artistWorkspaceAvailable: boolean;
  capabilities: Capability[];
  loading: boolean;
  switchWorkspace: (workspace: WorkspaceRole) => boolean;
  refreshRole: () => Promise<void>;
};

const RoleWorkspaceContext = createContext<RoleWorkspaceContextValue | null>(null);

export function RoleWorkspaceProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [accountRole, setAccountRole] = useState<AccountRole | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [artistReviewStatus, setArtistReviewStatus] = useState<ArtistReviewStatus | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceRole>("user");
  const [loading, setLoading] = useState(true);

  async function refreshRole() {
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setAccountRole(null);
      setDisplayName(null);
      setAvatarUrl(null);
      setArtistReviewStatus(null);
      setWorkspace("user");
      setLoading(false);
      return;
    }

    const [{ data: profile }, { data: artist }] = await Promise.all([
      supabase.from("profiles").select("role, display_name, avatar_url").eq("id", user.id).single(),
      supabase.from("artist_profiles").select("review_status").eq("user_id", user.id).maybeSingle()
    ]);

    const nextRole = (profile?.role ?? "user") as AccountRole;
    const nextArtistStatus = (artist?.review_status ?? null) as ArtistReviewStatus | null;
    const savedWorkspace = window.localStorage.getItem(ROLE_WORKSPACE_STORAGE_KEY);
    const artistAvailable = canUseArtistWorkspace(nextRole, nextArtistStatus);
    const nextWorkspace = savedWorkspace === "artist" && artistAvailable ? "artist" : "user";

    setAccountRole(nextRole);
    setDisplayName(profile?.display_name ?? null);
    setAvatarUrl(profile?.avatar_url ?? null);
    setArtistReviewStatus(nextArtistStatus);
    setWorkspace(nextWorkspace);
    window.localStorage.setItem(ROLE_WORKSPACE_STORAGE_KEY, nextWorkspace);
    setLoading(false);
  }

  useEffect(() => {
    refreshRole().catch(() => setLoading(false));
  }, []);

  const artistWorkspaceAvailable = canUseArtistWorkspace(accountRole, artistReviewStatus);
  const capabilities = accountRole ? getCapabilities(accountRole, artistReviewStatus) : [];

  function switchWorkspace(nextWorkspace: WorkspaceRole) {
    if (nextWorkspace === "artist" && !artistWorkspaceAvailable) return false;
    setWorkspace(nextWorkspace);
    window.localStorage.setItem(ROLE_WORKSPACE_STORAGE_KEY, nextWorkspace);
    return true;
  }

  const value: RoleWorkspaceContextValue = {
    accountRole,
    displayName,
    avatarUrl,
    artistReviewStatus,
    workspace,
    artistWorkspaceAvailable,
    capabilities,
    loading,
    switchWorkspace,
    refreshRole
  };

  return <RoleWorkspaceContext.Provider value={value}>{children}</RoleWorkspaceContext.Provider>;
}

export function useRoleWorkspace() {
  const context = useContext(RoleWorkspaceContext);
  if (!context) throw new Error("useRoleWorkspace must be used within RoleWorkspaceProvider");
  return context;
}
