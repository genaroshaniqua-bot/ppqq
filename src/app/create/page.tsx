"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, Loader2, Wand2 } from "lucide-react";
import { CharacterResult } from "@/components/character/CharacterResult";
import { ContinuationCard } from "@/components/generation/ContinuationCard";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { characterStyles, characterTypes } from "@/data/mock-generations";
import { generateAvatarPrompt, generateCharacter, generateDialogue, generateStory } from "@/lib/mock-generate";
import { saveCharacter } from "@/lib/storage";
import type { Character, CharacterContinuation, CharacterDraftInput } from "@/types/character";

const initialInput: CharacterDraftInput = {
  inspiration: "",
  style: "赛博幻想",
  type: "主角",
  world: "",
  extra: ""
};

export default function CreatePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-10 text-sm font-bold text-muted">正在准备创作台...</div>}>
      <CreateWorkspace />
    </Suspense>
  );
}

function CreateWorkspace() {
  const searchParams = useSearchParams();
  const [input, setInput] = useState<CharacterDraftInput>(initialInput);
  const [status, setStatus] = useState<"empty" | "loading" | "error" | "result">("empty");
  const [error, setError] = useState("");
  const [character, setCharacter] = useState<Character | null>(null);
  const [continuation, setContinuation] = useState<CharacterContinuation | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const idea = searchParams.get("idea");
    if (idea) {
      setInput((current) => ({ ...current, inspiration: idea }));
    }
  }, [searchParams]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function updateInput<K extends keyof CharacterDraftInput>(key: K, value: CharacterDraftInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  function handleGenerate() {
    if (!input.inspiration.trim()) {
      setStatus("error");
      setError("请先输入一句角色灵感，例如“会收集雨声的旧校舍守夜人”。");
      return;
    }

    setStatus("loading");
    setError("");
    setContinuation(null);

    window.setTimeout(() => {
      setCharacter(generateCharacter(input));
      setStatus("result");
    }, 720);
  }

  async function copyCharacter() {
    if (!character) return;
    await navigator.clipboard.writeText(
      `${character.name}\n${character.summary}\n外貌：${character.appearance}\n性格：${character.personality.join(" / ")}\n背景：${character.background}\n口癖：${character.speech}`
    );
    setToast("角色卡已复制");
  }

  function handleSave() {
    if (!character) return;
    saveCharacter(character);
    setToast("已保存到角色库");
  }

  async function copyContinuation() {
    if (!continuation) return;
    await navigator.clipboard.writeText(`${continuation.title}\n${continuation.body}\n${continuation.bullets.join("\n")}`);
    setToast("继续生成内容已复制");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-black uppercase text-primary">Create Workspace</p>
          <h1 className="mt-2 font-display text-4xl font-black md:text-6xl">OC 创作助手</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">输入一句灵感，选择风格和角色类型，生成可保存、可复制、可继续扩写的角色卡。</p>
        </div>
        <Link href="/characters" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-pill bg-white px-5 text-sm font-black shadow-soft">
          去角色库
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.42fr_0.58fr]">
        <section className="h-fit rounded-card border border-line bg-white p-5 shadow-soft">
          <div className="space-y-5">
            <div>
              <label htmlFor="inspiration" className="text-sm font-black">
                角色灵感 <span className="text-danger">*</span>
              </label>
              <textarea
                id="inspiration"
                value={input.inspiration}
                onChange={(event) => updateInput("inspiration", event.target.value)}
                rows={5}
                className="mt-2 w-full rounded-[24px] border border-line bg-bg px-4 py-3 text-base leading-7 outline-none transition focus:border-primary"
                placeholder="例如：雨夜里会替人修补梦境的纸符师"
              />
              <p className="mt-2 text-xs font-semibold text-muted">越具体越容易得到可继续创作的人设。</p>
            </div>

            <fieldset>
              <legend className="text-sm font-black">风格选择</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {characterStyles.map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => updateInput("style", style)}
                    className={`min-h-11 rounded-pill px-4 text-sm font-bold transition ${
                      input.style === style ? "bg-ink text-white" : "bg-bg text-muted hover:bg-primary/15 hover:text-ink"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-black">角色类型</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {characterTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => updateInput("type", type)}
                    className={`min-h-11 rounded-pill px-4 text-sm font-bold transition ${
                      input.type === type ? "bg-pink text-ink" : "bg-bg text-muted hover:bg-pink/20 hover:text-ink"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="world" className="text-sm font-black">
                世界观
              </label>
              <input
                id="world"
                value={input.world}
                onChange={(event) => updateInput("world", event.target.value)}
                className="mt-2 min-h-12 w-full rounded-pill border border-line bg-bg px-4 text-base outline-none transition focus:border-primary"
                placeholder="例如：旧城区、废土巡演、梦境铺子"
              />
            </div>

            <div>
              <label htmlFor="extra" className="text-sm font-black">
                补充设定
              </label>
              <textarea
                id="extra"
                value={input.extra}
                onChange={(event) => updateInput("extra", event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-[24px] border border-line bg-bg px-4 py-3 text-base leading-7 outline-none transition focus:border-primary"
                placeholder="可写亲友关系、禁忌、想要的性格反差"
              />
            </div>

            <Button type="button" onClick={handleGenerate} disabled={status === "loading"} className="w-full">
              {status === "loading" ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Wand2 size={18} aria-hidden="true" />}
              {status === "loading" ? "生成中" : "生成 OC 人设"}
            </Button>
          </div>
        </section>

        <div className="space-y-5">
          {status === "empty" && (
            <section className="surface-grid rounded-card border border-dashed border-line bg-white p-8 text-center shadow-soft">
              <p className="mx-auto grid size-14 place-items-center rounded-pill bg-primary/18 text-ink">
                <Wand2 size={24} aria-hidden="true" />
              </p>
              <h2 className="mt-4 font-display text-2xl font-black">生成结果会出现在这里</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">先输入角色灵感。结果会包含姓名、身份、外貌、性格、背景、能力、弱点、口癖和可分享摘要。</p>
            </section>
          )}

          {status === "loading" && (
            <section className="rounded-card border border-line bg-white p-5 shadow-soft" aria-busy="true">
              <div className="space-y-4">
                <div className="h-7 w-1/2 animate-pulse rounded-pill bg-bg" />
                <div className="h-28 animate-pulse rounded-card bg-bg" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="h-24 animate-pulse rounded-card bg-bg" />
                  <div className="h-24 animate-pulse rounded-card bg-bg" />
                </div>
                <p className="text-sm font-bold text-muted">正在整理角色冲突和可分享角色卡...</p>
              </div>
            </section>
          )}

          {status === "error" && (
            <section role="alert" className="rounded-card border border-danger/30 bg-white p-5 shadow-soft">
              <div className="flex gap-3">
                <AlertCircle className="mt-1 text-danger" size={22} aria-hidden="true" />
                <div>
                  <h2 className="font-display text-xl font-black">还不能生成</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">{error}</p>
                </div>
              </div>
            </section>
          )}

          {status === "result" && character ? (
            <>
              <CharacterResult character={character} onCopy={copyCharacter} onSave={handleSave} />
              <section className="rounded-card border border-line bg-white p-5 shadow-soft">
                <h2 className="font-display text-2xl font-black">继续生成</h2>
                <p className="mt-2 text-sm leading-6 text-muted">基于当前角色继续生成剧情、对话风格或头像提示词。</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Button type="button" variant="secondary" onClick={() => setContinuation(generateStory(character))}>
                    剧情片段
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setContinuation(generateDialogue(character))}>
                    对话风格
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setContinuation(generateAvatarPrompt(character))}>
                    头像提示词
                  </Button>
                </div>
              </section>
              {continuation ? <ContinuationCard item={continuation} onCopy={copyContinuation} /> : null}
            </>
          ) : null}
        </div>
      </div>
      <Toast message={toast} />
    </div>
  );
}
