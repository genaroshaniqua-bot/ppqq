export const LOGIN_APPEARANCE_KEY = "ai-oc-login-appearance";

export type LoginAppearance = "silver-twins" | "ocean-video" | "custom";

export const DEFAULT_LOGIN_APPEARANCE: LoginAppearance = "silver-twins";

export function readLoginAppearance(): LoginAppearance {
  if (typeof window === "undefined") {
    return DEFAULT_LOGIN_APPEARANCE;
  }

  const saved = window.localStorage.getItem(LOGIN_APPEARANCE_KEY);
  return saved === "ocean-video" || saved === "custom" ? saved : DEFAULT_LOGIN_APPEARANCE;
}

export function saveLoginAppearance(appearance: LoginAppearance) {
  window.localStorage.setItem(LOGIN_APPEARANCE_KEY, appearance);
}

const DATABASE_NAME = "ai-oc-studio-settings";
const STORE_NAME = "media";
const CUSTOM_BACKGROUND_KEY = "custom-login-background";

export interface CustomLoginBackground {
  blob: Blob;
  name: string;
  type: string;
}

function openSettingsDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, 1);

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function readCustomLoginBackground(): Promise<CustomLoginBackground | null> {
  const database = await openSettingsDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(CUSTOM_BACKGROUND_KEY);
    request.onsuccess = () => resolve((request.result as CustomLoginBackground | undefined) ?? null);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

export async function saveCustomLoginBackground(background: CustomLoginBackground): Promise<void> {
  const database = await openSettingsDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(background, CUSTOM_BACKGROUND_KEY);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function deleteCustomLoginBackground(): Promise<void> {
  const database = await openSettingsDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(CUSTOM_BACKGROUND_KEY);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}
