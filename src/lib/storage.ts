import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Character } from "@/types/character";

type CharacterRow = { id: string; name: string; summary: string; profile: Character; created_at: string };

async function account() {
  const client = createSupabaseBrowserClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new Error("请先登录后管理角色资产。");
  return { client, userId: user.id };
}
function toCharacter(row: CharacterRow): Character {
  return { ...row.profile, id: row.id, name: row.name, summary: row.summary, createdAt: row.created_at };
}
export async function readCharacters(): Promise<Character[]> {
  const { client, userId } = await account();
  const { data, error } = await client.from("characters")
    .select("id,name,summary,profile,created_at").eq("owner_id", userId).order("created_at", { ascending: false });
  if (error) throw new Error("角色库加载失败，请重试。");
  return ((data ?? []) as CharacterRow[]).map(toCharacter);
}
export async function saveCharacter(character: Character): Promise<Character> {
  const { client, userId } = await account();
  const { data, error } = await client.from("characters").insert({
    owner_id: userId, name: character.name, summary: character.summary, profile: character, visibility: "private"
  }).select("id,name,summary,profile,created_at").single();
  if (error) throw new Error("云端保存失败，请重试；当前创作结果仍保留在页面中。");
  window.dispatchEvent(new Event("characters-updated"));
  return toCharacter(data as CharacterRow);
}
export async function updateCharacter(character: Character): Promise<Character> {
  const { client, userId } = await account();
  const { data, error } = await client.from("characters").update({
    name: character.name, summary: character.summary, profile: character
  }).eq("id", character.id).eq("owner_id", userId).select("id,name,summary,profile,created_at").single();
  if (error) throw new Error("更新失败，角色可能已被删除。请刷新后重试。");
  window.dispatchEvent(new Event("characters-updated"));
  return toCharacter(data as CharacterRow);
}
export async function deleteCharacter(id: string): Promise<void> {
  const { client, userId } = await account();
  const { data, error } = await client.from("characters").delete().eq("id", id).eq("owner_id", userId).select("id");
  if (error || !data?.length) throw new Error("删除失败，请刷新角色库后重试。");
  window.dispatchEvent(new Event("characters-updated"));
}
