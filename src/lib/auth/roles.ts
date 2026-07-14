export type AccountRole = "user" | "artist" | "admin";
export type WorkspaceRole = "user" | "artist";
export type ArtistReviewStatus = "draft" | "pending" | "approved" | "rejected";

export type Capability =
  | "account.manage"
  | "character.create"
  | "commission.request"
  | "shop.buy"
  | "artist.dashboard"
  | "commission.respond"
  | "commission.deliver"
  | "service.manage"
  | "portfolio.manage"
  | "shop.sell"
  | "admin.dashboard"
  | "admin.artistReview"
  | "admin.disputeReview"
  | "admin.userManage"
  | "admin.serviceModerate"
  | "admin.shopManage"
  | "admin.auditRead";

const userCapabilities: Capability[] = [
  "account.manage",
  "character.create",
  "commission.request",
  "shop.buy"
];

const artistCapabilities: Capability[] = [
  ...userCapabilities,
  "artist.dashboard",
  "commission.respond",
  "commission.deliver",
  "service.manage",
  "portfolio.manage",
  "shop.sell"
];

const adminCapabilities: Capability[] = [
  "account.manage",
  "admin.dashboard",
  "admin.artistReview",
  "admin.disputeReview",
  "admin.userManage",
  "admin.serviceModerate",
  "admin.shopManage",
  "admin.auditRead"
];

export const ROLE_WORKSPACE_STORAGE_KEY = "oc-forge-active-workspace";

export function getCapabilities(
  accountRole: AccountRole,
  artistReviewStatus?: ArtistReviewStatus | null
) {
  if (accountRole === "admin") return adminCapabilities;
  if (accountRole === "artist" && artistReviewStatus === "approved") return artistCapabilities;
  return userCapabilities;
}

export function canUseArtistWorkspace(
  accountRole: AccountRole | null,
  artistReviewStatus?: ArtistReviewStatus | null
) {
  return accountRole === "artist" && artistReviewStatus === "approved";
}

export function hasCapability(
  accountRole: AccountRole,
  capability: Capability,
  artistReviewStatus?: ArtistReviewStatus | null
) {
  return getCapabilities(accountRole, artistReviewStatus).includes(capability);
}
