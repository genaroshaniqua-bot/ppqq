import { mockCharacters } from "@/data/mock-characters";
import type { Character } from "@/types/character";

const STORAGE_KEY = "ai-oc-studio.characters";

export function readCharacters(): Character[] {
  if (typeof window === "undefined") {
    return mockCharacters;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return mockCharacters;
  }

  try {
    const parsed = JSON.parse(raw) as Character[];
    return Array.isArray(parsed) ? parsed : mockCharacters;
  } catch {
    return mockCharacters;
  }
}

export function writeCharacters(characters: Character[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
  window.dispatchEvent(new Event("characters-updated"));
}

export function saveCharacter(character: Character) {
  const existing = readCharacters();
  const next = [character, ...existing.filter((item) => item.id !== character.id)];
  writeCharacters(next);
  return next;
}

export function deleteCharacter(id: string) {
  const next = readCharacters().filter((item) => item.id !== id);
  writeCharacters(next);
  return next;
}
