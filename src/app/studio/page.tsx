"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Cloud,
  CloudOff,
  Download,
  FileText,
  History,
  ImageIcon,
  Loader2,
  MessageSquareText,
  RotateCcw,
  Sparkles,
  Wand2
} from "lucide-react";
import { CharacterResult } from "@/components/character/CharacterResult";
import { ContinuationCard } from "@/components/generation/ContinuationCard";
import { FeatureArtPanel } from "@/components/layout/FeatureArtPanel";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { characterStyles, characterTypes } from "@/data/mock-generations";
import { COMMISSION_DRAFT_STORAGE_KEY, type CommissionDraft } from "@/lib/commission-draft";
import { generateAvatarPrompt, generateCharacter, generateDialogue, generateStory } from "@/lib/mock-generate";
import { saveCharacter } from "@/lib/storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Character, CharacterContinuation, CharacterDraftInput } from "@/types/character";

const DRAFT_STORAGE_KEY = "oc-forge.studio-draft";
const initialInput: CharacterDraftInput = { inspiration: "", style: "赛博幻想", type: "主角", world: "", extra: "" };

type StudioStatus = "empty" | "loading" | "error" | "result";
type CloudStatus = "idle" | "syncing" | "synced" | "offline";
type ContinuationKind = "story" | "dialogue" | "avatar";
type GenerationRow = {
  id: string;
  character_id: string | null;
  generation_type: string;
  result: { character?: Character; continuation?: CharacterContinuation } | null;
  status: string;
  created_at: string;
};

const continuationOptions = [
  { id: "story" as const, label: "剧情片段", description: "生成开场冲突与后续钩子", icon: FileText },
  { id: "dialogue" as const, label: "对话口吻", description: "固定语气、句式和示例台词", icon: MessageSquareText },
  { id: "avatar" as const, label: "头像提示", description: "整理构图、光线与避雷词", icon: ImageIcon }
];

export default function StudioPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-10 text-sm font-bold text-muted">正在准备创作工作台...</div>}>
      <StudioWorkspace />
    </Suspense>
  );
}

function StudioWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [input, setInput] = useState<CharacterDraftInput>(initialInput);
  const [status, setStatus] = useState<StudioStatus>("empty");
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>("idle");
  const [error, setError] = useState("");
  const [character, setCharacter] = useState<Character | null>(null);
  const [continuation, setContinuation] = useState<CharacterContinuation | null>(null);
  const [continuationKind, setContinuationKind] = useState<ContinuationKind | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [savedCharacterId, setSavedCharacterId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<GenerationRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [toast, setToast] = useState("");

  const progress = useMemo(() => {
    if (status === "loading") return 1;
    if (character && continuation) return 3;
    if (character) return 2;
    return input.inspiration.trim() ? 1 : 0;
  }, [character, continuation, input.inspiration, status]);

  useEffect(() => {
    const saved = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (saved) {
      try {
        setInput({ ...initialInput, ...(JSON.parse(saved) as Partial<CharacterDraftInput>) });
      } catch {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
    }
    const idea = searchParams.get("idea");
    if (idea) setInput((current) => ({ ...current, inspiration: idea }));
    void loadHistory();
  }, [searchParams]);

  useEffect(() => {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(input));
  }, [input]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error: historyError } = await supabase
        .from("ai_generations")
        .select("id, character_id, generation_type, result, status, created_at")
        .eq("owner_id", user.id)
        .eq("status", "succeeded")
        .order("created_at", { ascending: false })
        .limit(8);
      if (historyError) throw historyError;
      setHistory((data ?? []) as GenerationRow[]);
      setCloudStatus("synced");
    } catch {
      setCloudStatus("offline");
    } finally {
      setHistoryLoading(false);
    }
  }

  function updateInput<K extends keyof CharacterDraftInput>(key: K, value: CharacterDraftInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  function resetDraft() {
    setInput(initialInput);
    setStatus("empty");
    setCharacter(null);
    setContinuation(null);
    setContinuationKind(null);
    setGenerationId(null);
    setSavedCharacterId(null);
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    setToast("已开始一份新的角色草稿");
  }

  async function recordGeneration(
    generationType: string,
    prompt: Record<string, unknown>,
    result: Record<string, unknown>,
    characterId: string | null = null
  ) {
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("登录后才能同步创作记录");
    const { data, error: insertError } = await supabase
      .from("ai_generations")
      .insert({
        owner_id: user.id,
        character_id: characterId,
        generation_type: generationType,
        prompt,
        result,
        status: "succeeded"
      })
      .select("id")
      .single();
    if (insertError) throw insertError;
    return data.id as string;
  }

  async function handleGenerate() {
    if (!input.inspiration.trim()) {
      setStatus("error");
      setError("请先输入一句角色灵感，例如“会收集雨声的旧校舍守夜人”。");
      return;
    }

    setStatus("loading");
    setCloudStatus("syncing");
    setError("");
    setContinuation(null);
    setContinuationKind(null);
    setSavedCharacterId(null);
    await new Promise((resolve) => window.setTimeout(resolve, 520));
    const nextCharacter = generateCharacter(input);
    setCharacter(nextCharacter);
    setStatus("result");

    try {
      const nextGenerationId = await recordGeneration("character", { ...input }, { character: nextCharacter });
      setGenerationId(nextGenerationId);
      setCloudStatus("synced");
      await loadHistory();
    } catch {
      setCloudStatus("offline");
      setToast("角色已生成；云端记录暂未同步，可继续保存到角色库");
    }
  }

  async function handleContinuation(kind: ContinuationKind) {
    if (!character) return;
    setContinuationKind(kind);
    const next = kind === "story" ? generateStory(character) : kind === "dialogue" ? generateDialogue(character) : generateAvatarPrompt(character);
    setContinuation(next);
    setCloudStatus("syncing");
    try {
      await recordGeneration(kind, { character_name: character.name, character }, { continuation: next }, savedCharacterId);
      setCloudStatus("synced");
      await loadHistory();
    } catch {
      setCloudStatus("offline");
      setToast("扩写结果已生成，但云端记录暂未同步");
    }
  }

  async function copyCharacter() {
    if (!character) return;
    await navigator.clipboard.writeText(characterToText(character));
    setToast("角色卡已复制");
  }

  async function handleSave() {
    if (!character || saving) return;
    if (savedCharacterId) {
      setToast("这个角色已经保存到角色库");
      return;
    }

    setSaving(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("登录后才能保存角色");
      const { data, error: saveError } = await supabase
        .from("characters")
        .insert({ owner_id: user.id, name: character.name, summary: character.summary, profile: character, visibility: "private" })
        .select("id")
        .single();
      if (saveError) throw saveError;

      const nextCharacter = { ...character, id: data.id as string };
      setCharacter(nextCharacter);
      setSavedCharacterId(data.id as string);
      saveCharacter(nextCharacter);
      if (generationId) {
        await supabase.from("ai_generations").update({ character_id: data.id }).eq("id", generationId);
      }
      setCloudStatus("synced");
      setToast("已保存到 Supabase 角色库");
      await loadHistory();
    } catch (saveError) {
      saveCharacter(character);
      setCloudStatus("offline");
      setToast(saveError instanceof Error ? `云端保存失败：${saveError.message}` : "云端保存失败，已保留在当前设备");
    } finally {
      setSaving(false);
    }
  }

  async function copyContinuation() {
    if (!continuation) return;
    await navigator.clipboard.writeText(`${continuation.title}\n${continuation.body}\n${continuation.bullets.join("\n")}`);
    setToast("扩写内容已复制");
  }

  function downloadCharacter() {
    if (!character) return;
    const blob = new Blob([characterToText(character)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${character.name.replace(/[\\/:*?\"<>|]/g, "-")}-角色卡.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    setToast("角色卡 TXT 已导出");
  }

  function prepareCommissionDraft() {
    if (!character) return;
    const draft: CommissionDraft = {
      title: `为 ${character.name} 绘制角色视觉稿`,
      category: "角色立绘",
      brief: `${character.summary}\n\n外貌：${character.appearance}\n性格：${character.personality.join(" / ")}\n创作备注：${character.notes}`,
      budgetMin: 300,
      budgetMax: 800,
      deadlineLabel: "两周内",
      usageScope: "personal",
      requirements: ["需要过程确认", "需要源文件"]
    };
    window.localStorage.setItem(COMMISSION_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    router.push("/create");
  }

  function reopenGeneration(row: GenerationRow) {
    const restored = row.result?.character;
    if (!restored) return;
    setCharacter(restored);
    setInput((current) => ({
      ...current,
      inspiration: restored.summary,
      style: restored.style,
      type: restored.type,
      extra: restored.notes
    }));
    setGenerationId(row.id);
    setSavedCharacterId(row.character_id);
    setContinuation(null);
    setContinuationKind(null);
    setStatus("result");
    setToast(`已恢复 ${restored.name} 的创作现场`);
  }

  const cloudLabel = cloudStatus === "syncing" ? "同步中" : cloudStatus === "synced" ? "已同步 Supabase" : cloudStatus === "offline" ? "仅保留在当前设备" : "等待创作";

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="overflow-hidden rounded-[30px] bg-ink text-white shadow-[0_24px_70px_rgba(18,16,22,0.2)]">
        <div className="grid gap-7 px-6 py-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end lg:px-9">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-black">
              <span className="inline-flex min-h-9 items-center gap-2 rounded-pill bg-lime px-4 text-ink"><Sparkles size={15} />OC 创作工坊</span>
              <span className="inline-flex min-h-9 items-center gap-2 rounded-pill bg-white/10 px-4 text-white/72">
                {cloudStatus === "offline" ? <CloudOff size={15} /> : <Cloud size={15} />}{cloudLabel}
              </span>
            </div>
            <h1 className="mt-5 max-w-3xl font-display text-4xl font-black tracking-[-0.04em] sm:text-5xl">把一句灵感，推进成能继续创作的角色资产。</h1>
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/62">生成角色设定，沿着剧情、口吻和头像方向继续扩写；每次成功生成都会进入真实创作记录。</p>
          </div>
          <div className="space-y-3">
            <FeatureArtPanel src="/images/studio-character-creation.png" alt="画师在数位屏上绘制原创幻想角色" eyebrow="从灵感到角色资产" caption="人设、配色、立绘和周边方向在同一个创作现场持续推进" className="min-h-[210px]" priority />
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={resetDraft} className="inline-flex min-h-11 items-center gap-2 rounded-pill bg-white/10 px-4 text-sm font-black transition hover:bg-white/16"><RotateCcw size={16} />新建草稿</button>
              <Link href="/characters" className="inline-flex min-h-11 items-center gap-2 rounded-pill bg-white px-4 text-sm font-black text-ink"><History size={16} />角色库<ArrowRight size={15} /></Link>
            </div>
          </div>
        </div>

        <ol className="grid grid-cols-2 border-t border-white/10 bg-white/[0.025] sm:grid-cols-4" aria-label="创作进度">
          {["写下灵感", "生成人设", "继续扩写", "保存资产"].map((label, index) => {
            const complete = index < progress || (index === 3 && Boolean(savedCharacterId));
            const active = index === progress && !savedCharacterId;
            return (
              <li
                key={label}
                aria-current={active ? "step" : undefined}
                className={`relative flex min-h-14 items-center gap-3 px-4 transition-colors sm:px-5 ${index % 2 === 0 ? "border-r border-white/10" : ""} ${index > 1 ? "border-t border-white/10 sm:border-t-0" : ""} ${index < 3 ? "sm:border-r" : "sm:border-r-0"} ${active ? "bg-lime/[0.08]" : ""}`}
              >
                <span className={`grid size-8 shrink-0 place-items-center rounded-full border text-xs font-black transition ${complete ? "border-lime bg-lime text-ink shadow-[0_0_0_4px_rgba(181,255,60,0.08)]" : active ? "border-lime bg-lime/15 text-lime shadow-[0_0_0_4px_rgba(181,255,60,0.06)]" : "border-white/10 bg-white/[0.06] text-white/42"}`}>
                  {complete ? <Check size={14} strokeWidth={3} /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span className={`block text-[10px] font-black uppercase tracking-[0.14em] ${complete ? "text-lime/80" : active ? "text-lime" : "text-white/28"}`}>
                    {complete ? "已完成" : active ? "当前步骤" : `步骤 ${index + 1}`}
                  </span>
                  <span className={`mt-0.5 block truncate text-sm font-black ${complete || active ? "text-white" : "text-white/45"}`}>{label}</span>
                </span>
                {active ? <span aria-hidden="true" className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-lime" /> : null}
              </li>
            );
          })}
        </ol>
      </header>

      <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)_280px]">
        <section className="h-fit rounded-[28px] border border-line bg-white p-5 shadow-soft xl:sticky xl:top-24">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-xs font-black uppercase text-primary">Character brief</p><h2 className="mt-1 font-display text-2xl font-black">角色创作单</h2></div>
            <span className="rounded-pill bg-bg px-3 py-1 text-xs font-black text-muted">自动保留草稿</span>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <label htmlFor="inspiration" className="text-sm font-black">角色灵感 <span className="text-danger">*</span></label>
              <textarea id="inspiration" value={input.inspiration} onChange={(event) => updateInput("inspiration", event.target.value)} rows={5} className="mt-2 w-full rounded-[22px] border border-line bg-bg px-4 py-3 text-base leading-7 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10" placeholder="例如：雨夜里会替人修补梦境的纸符师" />
              <p className="mt-2 text-xs font-semibold leading-5 text-muted">写清角色做什么、身处哪里，以及最特别的矛盾。</p>
            </div>

            <fieldset><legend className="text-sm font-black">视觉风格</legend><div className="mt-2 flex flex-wrap gap-2">{characterStyles.map((style) => <button key={style} type="button" onClick={() => updateInput("style", style)} className={`min-h-10 rounded-pill px-3 text-xs font-black transition ${input.style === style ? "bg-ink text-white" : "bg-bg text-muted hover:bg-primary/15 hover:text-ink"}`}>{style}</button>)}</div></fieldset>
            <fieldset><legend className="text-sm font-black">叙事位置</legend><div className="mt-2 flex flex-wrap gap-2">{characterTypes.map((type) => <button key={type} type="button" onClick={() => updateInput("type", type)} className={`min-h-10 rounded-pill px-3 text-xs font-black transition ${input.type === type ? "bg-pink text-ink" : "bg-bg text-muted hover:bg-pink/20 hover:text-ink"}`}>{type}</button>)}</div></fieldset>
            <div><label htmlFor="world" className="text-sm font-black">世界观坐标</label><input id="world" value={input.world} onChange={(event) => updateInput("world", event.target.value)} className="mt-2 min-h-12 w-full rounded-pill border border-line bg-bg px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10" placeholder="旧城区、废土巡演、梦境铺子…" /></div>
            <div><label htmlFor="extra" className="text-sm font-black">必须保留的设定</label><textarea id="extra" value={input.extra} onChange={(event) => updateInput("extra", event.target.value)} rows={3} className="mt-2 w-full rounded-[22px] border border-line bg-bg px-4 py-3 text-sm leading-6 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10" placeholder="关系、禁忌、性格反差或关键道具" /></div>
            <Button type="button" onClick={handleGenerate} disabled={status === "loading"} className="w-full">{status === "loading" ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}{status === "loading" ? "正在编织角色冲突…" : character ? "重新生成人设" : "生成 OC 人设"}</Button>
          </div>
        </section>

        <main className="min-w-0 space-y-5">
          {status === "empty" ? (
            <section className="surface-grid grid min-h-[430px] place-items-center rounded-[28px] border border-dashed border-line bg-white p-8 text-center shadow-soft">
              <div><span className="mx-auto grid size-16 place-items-center rounded-full bg-primary/15 text-ink"><Wand2 size={28} /></span><h2 className="mt-5 font-display text-3xl font-black">先给角色一个不可替代的矛盾</h2><p className="mx-auto mt-3 max-w-lg text-sm font-semibold leading-7 text-muted">“能力很强”还不是角色；“能修补别人的梦，却每晚忘记自己”才是可以继续写下去的起点。</p></div>
            </section>
          ) : null}

          {status === "loading" ? (
            <section className="rounded-[28px] border border-line bg-white p-6 shadow-soft" aria-busy="true"><div className="space-y-4"><div className="h-8 w-2/5 animate-pulse rounded-pill bg-bg" /><div className="h-32 animate-pulse rounded-[24px] bg-bg" /><div className="grid gap-3 sm:grid-cols-2"><div className="h-28 animate-pulse rounded-[24px] bg-bg" /><div className="h-28 animate-pulse rounded-[24px] bg-bg" /></div><p className="text-sm font-bold text-muted">正在整理身份、欲望、能力边界与视觉识别点…</p></div></section>
          ) : null}

          {status === "error" ? (
            <section role="alert" className="rounded-[28px] border border-danger/30 bg-white p-6 shadow-soft"><div className="flex gap-3"><AlertCircle className="mt-1 text-danger" size={22} /><div><h2 className="font-display text-xl font-black">还不能开始生成</h2><p className="mt-2 text-sm leading-6 text-muted">{error}</p></div></div></section>
          ) : null}

          {status === "result" && character ? (
            <>
              <CharacterResult character={character} onCopy={copyCharacter} onSave={handleSave} />
              <section className="rounded-[28px] border border-line bg-white p-5 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase text-primary">Branch the idea</p><h2 className="mt-1 font-display text-2xl font-black">沿三个方向继续创作</h2><p className="mt-2 text-sm font-semibold leading-6 text-muted">每条分支独立生成并写入创作历史，不会覆盖角色设定。</p></div><button type="button" onClick={downloadCharacter} className="inline-flex min-h-11 items-center gap-2 rounded-pill bg-bg px-4 text-sm font-black transition hover:bg-primary/15"><Download size={16} />导出 TXT</button></div>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {continuationOptions.map((option) => { const Icon = option.icon; const selected = continuationKind === option.id; return <button key={option.id} type="button" onClick={() => void handleContinuation(option.id)} className={`rounded-[22px] border p-4 text-left transition ${selected ? "border-ink bg-ink text-white" : "border-line bg-bg hover:border-primary hover:bg-primary/10"}`}><Icon size={20} /><span className="mt-4 block font-display text-lg font-black">{option.label}</span><span className={`mt-1 block text-xs font-semibold leading-5 ${selected ? "text-white/62" : "text-muted"}`}>{option.description}</span></button>; })}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2"><Button type="button" variant="secondary" onClick={prepareCommissionDraft}>带着设定发布约稿<ArrowRight size={16} /></Button><Button type="button" onClick={handleSave} disabled={saving || Boolean(savedCharacterId)}>{saving ? <Loader2 size={17} className="animate-spin" /> : savedCharacterId ? <Check size={17} /> : <Cloud size={17} />}{savedCharacterId ? "已保存到角色库" : saving ? "正在保存…" : "保存为角色资产"}</Button></div>
              </section>
              {continuation ? <ContinuationCard item={continuation} onCopy={copyContinuation} /> : null}
            </>
          ) : null}
        </main>

        <aside className="h-fit rounded-[28px] border border-line bg-white p-5 shadow-soft xl:sticky xl:top-24">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase text-primary">Cloud history</p><h2 className="mt-1 font-display text-xl font-black">最近创作</h2></div><button type="button" onClick={() => void loadHistory()} className="grid size-10 place-items-center rounded-full bg-bg text-muted transition hover:bg-primary/15 hover:text-ink" aria-label="刷新创作历史"><RotateCcw size={16} /></button></div>
          <div className="mt-5 space-y-3">
            {historyLoading ? <div className="grid min-h-32 place-items-center rounded-[22px] bg-bg"><Loader2 className="animate-spin text-primary" size={20} /></div> : null}
            {!historyLoading && history.length === 0 ? <div className="rounded-[22px] bg-bg p-4"><p className="text-sm font-black">还没有云端记录</p><p className="mt-2 text-xs font-semibold leading-5 text-muted">完成第一次生成后，创作现场会出现在这里。</p></div> : null}
            {history.map((row) => {
              const restored = row.result?.character;
              const item = row.result?.continuation;
              const label = row.generation_type === "character" ? "角色设定" : row.generation_type === "story" ? "剧情片段" : row.generation_type === "dialogue" ? "对话口吻" : "头像提示";
              return (
                <article key={row.id} className="rounded-[20px] border border-line bg-bg p-4">
                  <div className="flex items-center justify-between gap-2"><span className="rounded-pill bg-white px-2.5 py-1 text-[11px] font-black text-primary">{label}</span><time className="text-[10px] font-bold text-muted">{new Date(row.created_at).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}</time></div>
                  <h3 className="mt-3 line-clamp-2 text-sm font-black leading-5">{restored?.name ?? item?.title ?? "已完成的创作记录"}</h3>
                  {restored ? <button type="button" onClick={() => reopenGeneration(row)} className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-pill bg-white text-xs font-black transition hover:bg-ink hover:text-white"><History size={14} />恢复创作</button> : null}
                </article>
              );
            })}
          </div>
        </aside>
      </div>
      <Toast message={toast} />
    </div>
  );
}

function characterToText(character: Character) {
  return `${character.name}\n${character.summary}\n\n外貌：${character.appearance}\n性格：${character.personality.join(" / ")}\n背景：${character.background}\n能力：${character.ability}\n弱点：${character.weakness}\n口癖：${character.speech}\n创作备注：${character.notes}`;
}
