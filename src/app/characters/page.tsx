"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, Plus, Search, Sparkles, X } from "lucide-react";
import { CharacterCard } from "@/components/character/CharacterCard";
import { FeatureArtPanel } from "@/components/layout/FeatureArtPanel";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import {
  characterBasicFieldMeta,
  characterBasicSuggestions,
  type CharacterBasicField
} from "@/data/character-edit-suggestions";
import { deleteCharacter, readCharacters, writeCharacters } from "@/lib/storage";
import type { Character } from "@/types/character";

type FilterOption = {
  label: string;
  matches: (character: Character) => boolean;
};

const characterFilterGroups: Array<{ id: string; label: string; options: FilterOption[] }> = [
  {
    id: "world",
    label: "世界观",
    options: [
      { label: "校园怪谈", matches: (character) => character.style === "校园怪谈" },
      { label: "赛博幻想", matches: (character) => character.style === "赛博幻想" },
      { label: "国风异能", matches: (character) => character.style === "国风异能" },
      { label: "废土偶像", matches: (character) => character.style === "废土偶像" },
      { label: "日常治愈", matches: (character) => character.style === "日常治愈" }
    ]
  },
  {
    id: "role",
    label: "角色定位",
    options: [
      { label: "主角", matches: (character) => character.type === "主角" },
      { label: "搭档", matches: (character) => character.type === "搭档" },
      { label: "NPC", matches: (character) => character.type === "NPC" },
      { label: "反派", matches: (character) => character.type === "反派" },
      { label: "看板娘", matches: (character) => character.type === "看板娘" }
    ]
  },
  {
    id: "mood",
    label: "创作气质",
    options: [
      { label: "灵异社团", matches: (character) => character.tags.some((tag) => tag.includes("灵异")) },
      { label: "治愈向", matches: (character) => /治愈|温柔/.test(`${character.tags.join(" ")} ${character.notes}`) },
      { label: "悬疑感", matches: (character) => /悬疑|怪谈/.test(`${character.tags.join(" ")} ${character.notes}`) },
      { label: "冒险感", matches: (character) => /冒险|废土/.test(`${character.tags.join(" ")} ${character.notes}`) }
    ]
  }
];

export default function CharactersPage() {
  const router = useRouter();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterOption | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
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
      const byCategory = !activeFilter || activeFilter.matches(character);
      const haystack = [character.name, character.identity, character.summary, character.tags.join(" "), character.background].join(" ").toLowerCase();
      const byQuery = !keyword || haystack.includes(keyword);
      return byCategory && byQuery;
    });
  }, [activeFilter, characters, query]);

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

  function returnToPreviousPage() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/studio");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={returnToPreviousPage}
        className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-pill border border-line bg-white px-4 text-sm font-black text-ink shadow-soft transition hover:border-primary hover:bg-primary/10"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        返回上一步
      </button>

      <section className="mb-7 grid gap-6 rounded-[36px] border border-line bg-white p-6 shadow-soft md:p-8 lg:grid-cols-[minmax(0,1fr)_350px] lg:items-center">
        <div>
          <p className="text-xs font-black uppercase text-primary">Character Library</p>
          <h1 className="mt-2 font-display text-4xl font-black md:text-6xl">角色资产库</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">管理长期角色资产。当前使用 mock 数据和 localStorage 保存，适合前端演示。</p>
          <Link href="/studio" className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-pill bg-ink px-5 text-sm font-black text-white shadow-soft">
            <Plus size={17} aria-hidden="true" />
            新建角色
          </Link>
        </div>
        <FeatureArtPanel src="/images/case-sheet.png" alt="角色立绘、设定拆解、表情和周边应用组成的角色资产档案" eyebrow="角色资产档案" caption="长期保存设定、立绘、表情与后续创作方向" className="min-h-[220px]" />
      </section>

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
          <div className="min-w-0">
            <div className="rail-scroll flex gap-2 overflow-x-auto pb-1" aria-label="角色分类">
              <button
                type="button"
                onClick={() => {
                  setActiveFilter(null);
                  setExpandedGroup(null);
                }}
                className={`min-h-12 shrink-0 rounded-pill px-4 text-sm font-black transition ${
                  !activeFilter ? "bg-ink text-white" : "bg-bg text-muted hover:bg-primary/15 hover:text-ink"
                }`}
              >
                全部
              </button>
              {characterFilterGroups.map((group) => {
                const isExpanded = expandedGroup === group.id;
                const hasActiveOption = group.options.includes(activeFilter as FilterOption);
                return (
                  <button
                    key={group.id}
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                    className={`inline-flex min-h-12 shrink-0 items-center gap-2 rounded-pill px-4 text-sm font-black transition ${
                      hasActiveOption || isExpanded ? "bg-primary/18 text-ink" : "bg-bg text-muted hover:bg-primary/15 hover:text-ink"
                    }`}
                  >
                    {group.label}
                    <ChevronDown size={15} className={`transition ${isExpanded ? "rotate-180" : ""}`} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
            {expandedGroup ? (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                {characterFilterGroups.find((group) => group.id === expandedGroup)?.options.map((option) => {
                  const selected = activeFilter === option;
                  return (
                    <button
                      key={option.label}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setActiveFilter(option)}
                      className={`min-h-10 rounded-pill border px-3 text-xs font-black transition ${
                        selected ? "border-ink bg-ink text-white" : "border-line bg-white text-muted hover:border-primary hover:text-ink"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {filtered.length > 0 ? (
        <section className="space-y-6">
          {filtered.map((character) => (
            <CharacterCard key={character.id} character={character} onEdit={setEditing} onDelete={setPendingDelete} />
          ))}
        </section>
      ) : (
        <section className="rounded-card border border-dashed border-line bg-white p-8 text-center shadow-soft">
          <h2 className="font-display text-2xl font-black">还没有匹配角色</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">换一个筛选条件，或去创作页生成并保存新的 OC。</p>
          <Link href="/studio" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-pill bg-ink px-5 text-sm font-black text-white">
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
  const [suggestionField, setSuggestionField] = useState<CharacterBasicField>("name");

  function applySuggestion(field: CharacterBasicField, suggestion: string) {
    setDraft((current) => {
      if (current[field].includes(suggestion)) return current;

      if (characterBasicFieldMeta[field].mode === "replace") {
        return { ...current, [field]: suggestion };
      }

      const existing = current[field].trim();
      if (!existing) return { ...current, [field]: suggestion };

      if (field === "summary") {
        const nextValue = /[。！？.!?]$/.test(existing) ? `${existing}${suggestion}。` : `${existing}，${suggestion}`;
        return { ...current, [field]: nextValue };
      }

      return { ...current, [field]: `${existing.replace(/[；、。]+$/, "")}；${suggestion}` };
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/50 px-4 py-8">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-title"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-card bg-white p-5 shadow-soft"
      >
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

        <section aria-labelledby="suggestion-title" className="mt-5 rounded-[24px] border border-line bg-bg p-4">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-pill bg-primary/18 text-ink">
              <Sparkles size={18} aria-hidden="true" />
            </span>
            <div>
              <h3 id="suggestion-title" className="text-sm font-black">
                基础词条助手
              </h3>
              <p className="mt-1 text-xs font-semibold leading-5 text-muted">按部分查找短词条，点击即可快速补充角色设定。</p>
            </div>
          </div>

          <div className="rail-scroll mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="基础信息词条分类">
            {(Object.keys(characterBasicFieldMeta) as CharacterBasicField[]).map((field) => (
              <button
                key={field}
                type="button"
                role="tab"
                aria-selected={suggestionField === field}
                aria-controls={`suggestions-${field}`}
                onClick={() => setSuggestionField(field)}
                className={`min-h-10 shrink-0 rounded-pill px-4 text-sm font-black transition ${
                  suggestionField === field ? "bg-ink text-white" : "bg-white text-muted hover:bg-primary/15 hover:text-ink"
                }`}
              >
                {characterBasicFieldMeta[field].label}
              </button>
            ))}
          </div>

          <div id={`suggestions-${suggestionField}`} role="tabpanel" className="mt-4 rounded-[20px] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-black">{characterBasicFieldMeta[suggestionField].label}词条</p>
              <p className="text-xs font-semibold text-muted">{characterBasicFieldMeta[suggestionField].hint}</p>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {characterBasicSuggestions[suggestionField].map((group) => (
                <div key={group.label}>
                  <p className="text-xs font-black text-muted">{group.label}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {group.items.map((item) => {
                      const selected = draft[suggestionField].includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => applySuggestion(suggestionField, item)}
                          className={`min-h-9 rounded-pill border px-3 text-xs font-bold transition ${
                            selected
                              ? "border-primary bg-primary/18 text-ink"
                              : "border-line bg-bg text-muted hover:border-primary hover:text-ink"
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

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
