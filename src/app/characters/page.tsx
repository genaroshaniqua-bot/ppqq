"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { CharacterCard } from "@/components/character/CharacterCard";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { characterStyles } from "@/data/mock-generations";
import { deleteCharacter, readCharacters, writeCharacters } from "@/lib/storage";
import type { Character } from "@/types/character";

export default function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [query, setQuery] = useState("");
  const [style, setStyle] = useState("全部");
  const [editing, setEditing] = useState<Character | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Character | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    setCharacters(readCharacters());
    const sync = () => setCharacters(readCharacters());
    window.addEventListener("characters-updated", sync);
    return () => window.removeEventListener("characters-updated", sync);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return characters.filter((character) => {
      const byStyle = style === "全部" || character.style === style;
      const haystack = [character.name, character.identity, character.summary, character.tags.join(" "), character.background].join(" ").toLowerCase();
      const byQuery = !keyword || haystack.includes(keyword);
      return byStyle && byQuery;
    });
  }, [characters, query, style]);

  function saveEdit(character: Character) {
    const next = characters.map((item) => (item.id === character.id ? character : item));
    setCharacters(next);
    writeCharacters(next);
    setEditing(null);
    setToast("角色信息已更新");
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    setCharacters(deleteCharacter(pendingDelete.id));
    setToast(`已删除 ${pendingDelete.name}`);
    setPendingDelete(null);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-black uppercase text-primary">Character Library</p>
          <h1 className="mt-2 font-display text-4xl font-black md:text-6xl">角色资产库</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">管理长期角色资产。当前使用 mock 数据和 localStorage 保存，适合前端演示。</p>
        </div>
        <Link href="/create" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-pill bg-ink px-5 text-sm font-black text-white shadow-soft">
          <Plus size={17} aria-hidden="true" />
          新建角色
        </Link>
      </div>

      <section className="mb-6 rounded-card border border-line bg-white p-4 shadow-soft">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="flex min-h-12 items-center gap-3 rounded-pill bg-bg px-4" htmlFor="character-search">
            <Search size={18} className="text-muted" aria-hidden="true" />
            <input
              id="character-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-base font-semibold outline-none placeholder:text-muted"
              placeholder="搜索角色名、标签、背景..."
            />
          </label>
          <div className="rail-scroll flex gap-2 overflow-x-auto">
            {["全部", ...characterStyles].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setStyle(item)}
                className={`min-h-12 shrink-0 rounded-pill px-4 text-sm font-black transition ${
                  style === item ? "bg-ink text-white" : "bg-bg text-muted hover:bg-primary/15 hover:text-ink"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      {filtered.length > 0 ? (
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((character) => (
            <CharacterCard key={character.id} character={character} onEdit={setEditing} onDelete={setPendingDelete} />
          ))}
        </section>
      ) : (
        <section className="rounded-card border border-dashed border-line bg-white p-8 text-center shadow-soft">
          <h2 className="font-display text-2xl font-black">还没有匹配角色</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">换一个筛选条件，或去创作页生成并保存新的 OC。</p>
          <Link href="/create" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-pill bg-ink px-5 text-sm font-black text-white">
            去创作
          </Link>
        </section>
      )}

      {editing ? <EditDialog character={editing} onClose={() => setEditing(null)} onSave={saveEdit} /> : null}

      {pendingDelete ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 px-4">
          <section role="dialog" aria-modal="true" aria-labelledby="delete-title" className="w-full max-w-md rounded-card bg-white p-5 shadow-soft">
            <h2 id="delete-title" className="font-display text-2xl font-black">
              删除 {pendingDelete.name}？
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">删除后会从本地角色库移除。示例角色仍可通过刷新默认数据恢复。</p>
            <div className="mt-5 flex gap-3">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setPendingDelete(null)}>
                取消
              </Button>
              <Button type="button" variant="danger" className="flex-1" onClick={confirmDelete}>
                确认删除
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      <Toast message={toast} />
    </div>
  );
}

function EditDialog({
  character,
  onClose,
  onSave
}: {
  character: Character;
  onClose: () => void;
  onSave: (character: Character) => void;
}) {
  const [draft, setDraft] = useState(character);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/50 px-4 py-8">
      <section role="dialog" aria-modal="true" aria-labelledby="edit-title" className="w-full max-w-2xl rounded-card bg-white p-5 shadow-soft">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-primary">Edit Character</p>
            <h2 id="edit-title" className="mt-1 font-display text-2xl font-black">
              编辑基础信息
            </h2>
          </div>
          <button type="button" onClick={onClose} className="grid min-h-11 min-w-11 place-items-center rounded-pill bg-bg" aria-label="关闭编辑窗口">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="角色姓名" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />
          <Field label="身份" value={draft.identity} onChange={(value) => setDraft({ ...draft, identity: value })} />
          <Field label="摘要" value={draft.summary} onChange={(value) => setDraft({ ...draft, summary: value })} wide />
          <Field label="创作备注" value={draft.notes} onChange={(value) => setDraft({ ...draft, notes: value })} wide />
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            取消
          </Button>
          <Button type="button" className="flex-1" onClick={() => onSave(draft)}>
            保存修改
          </Button>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  wide = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "md:col-span-2" : undefined}>
      <span className="text-sm font-black">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={wide ? 3 : 2}
        className="mt-2 w-full rounded-[22px] border border-line bg-bg px-4 py-3 text-sm leading-6 outline-none focus:border-primary"
      />
    </label>
  );
}
