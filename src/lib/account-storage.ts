// Unscoped legacy data has no trustworthy owner and is never imported automatically.
let activeUserId: string | null = null;
export function setActiveStorageUser(userId: string | null) { activeUserId = userId; }
function scopedKey(key: string) { return activeUserId ? `oc-forge.account.${activeUserId}.${key}` : null; }
export const accountStorage = {
  getItem(key: string): string | null {
    const scoped = scopedKey(key);
    if (!scoped || typeof window === "undefined") return null;
    try { return window.localStorage.getItem(scoped); } catch { return null; }
  },
  setItem(key: string, value: string): boolean {
    const scoped = scopedKey(key);
    if (!scoped || typeof window === "undefined") return false;
    try { window.localStorage.setItem(scoped, value); return true; } catch { return false; }
  },
  removeItem(key: string) {
    const scoped = scopedKey(key);
    if (scoped && typeof window !== "undefined") {
      try { window.localStorage.removeItem(scoped); } catch { /* Storage may be disabled. */ }
    }
  }
};
