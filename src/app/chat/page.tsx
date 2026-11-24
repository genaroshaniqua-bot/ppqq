"use client";

import { accountStorage } from "@/lib/account-storage";

import { useEffect, useMemo, useState } from "react";
import { Copy, MessageCircle, Save, Trash2 } from "lucide-react";
import { GenerationModePicker, type GenerationMode } from "@/components/generation/GenerationMode";
import { requestAi } from "@/lib/ai/client";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { FeatureArtPanel } from "@/components/layout/FeatureArtPanel";
import { interactionPrompts } from "@/data/mock-platform";
import { useCharacters } from "@/lib/use-characters";
import { cn } from "@/lib/utils";

const SAVED_INTERACTIONS_KEY = "oc-forge-saved-interactions";

type SavedInteraction = {
  id: string;
  characterName: string;
  scene: string;
  lines: string[];
  createdAt: string;
  mode?: GenerationMode;
};

export default function ChatPage() {
  const { characters, loading, error, refresh } = useCharacters();
  const [characterId, setCharacterId] = useState("");
  const [promptId, setPromptId] = useState(interactionPrompts[0].id);
  const [customScene, setCustomScene] = useState("");
  const [result, setResult] = useState<string[]>([]);
  const [savedInteractions, setSavedInteractions] = useState<SavedInteraction[]>([]);
  const [toast, setToast] = useState("");
  const [mode, setMode] = useState<GenerationMode>("template");
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [resultContext, setResultContext] = useState<{ characterName: string; scene: string; mode: GenerationMode } | null>(null);

  useEffect(() => {
    try {
      setSavedInteractions(JSON.parse(accountStorage.getItem(SAVED_INTERACTIONS_KEY) ?? "[]") as SavedInteraction[]);
    } catch {
      accountStorage.removeItem(SAVED_INTERACTIONS_KEY);
    }
  }, []);

  useEffect(() => {
    setCharacterId((id) => characters.some((item) => item.id === id) ? id : characters[0]?.id ?? "");
  }, [characters]);

  const selectedCharacter = useMemo(() => characters.find((character) => character.id === characterId), [characters, characterId]);
  const selectedPrompt = interactionPrompts.find((prompt) => prompt.id === promptId) ?? interactionPrompts[0];

  async function generateDialogue() {
    if (!selectedCharacter || generating) return;
    const scene = customScene.trim() || selectedPrompt.scene;
    setGenerating(true);
    setGenerationError("");
    setResult([]);
    setResultContext(null);
    try {
      if (mode === "ai") {
        const response = await requestAi({ kind: "interaction", character: selectedCharacter, characterId: selectedCharacter.id, scene });
        if (!response.lines?.length) throw new Error("AI 未返回对话，请重试。");
        setResult(response.lines);
        if (response.warning) setToast(response.warning);
      } else {
        setResult([
          `${selectedCharacter.name}：${selectedPrompt.sampleLines[0]}`,
          "你：如果这次我想换一种做法呢？",
          `${selectedCharacter.name}：${selectedCharacter.speech}`,
          `${selectedCharacter.name}：场景是“${scene}”。关系先别急着升温，先让行动证明。`
        ]);
      }
      setResultContext({ characterName: selectedCharacter.name, scene, mode });
    } catch (cause) { setGenerationError(cause instanceof Error ? cause.message : "生成失败，请重试。"); }
    finally { setGenerating(false); }
  }

  async function copyDialogue() {
    if (result.length === 0) return;
    await navigator.clipboard.writeText(result.join("\n"));
    setToast("互动会话已复制");
  }

  function saveDialogue() {
    if (!resultContext || result.length === 0) return;
    const next: SavedInteraction[] = [{
      id: crypto.randomUUID(),
      characterName: resultContext.characterName,
      scene: resultContext.scene,
      mode: resultContext.mode,
      lines: result,
      createdAt: new Date().toISOString()
    }, ...savedInteractions].slice(0, 20);
    if (!accountStorage.setItem(SAVED_INTERACTIONS_KEY, JSON.stringify(next))) { setToast("保存失败：当前设备存储不可用，请复制记录后重试。"); return; }
    setSavedInteractions(next);
    setToast("互动记录已保存到当前设备");
  }

  function removeSavedInteraction(id: string) {
    const next = savedInteractions.filter((interaction) => interaction.id !== id);
    if (!accountStorage.setItem(SAVED_INTERACTIONS_KEY, JSON.stringify(next))) { setToast("保存失败：当前设备存储不可用，请复制记录后重试。"); return; }
    setSavedInteractions(next);
    setToast("互动记录已删除");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-7 grid gap-6 rounded-[36px] border border-line bg-white p-6 shadow-soft md:p-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
        <div><p className="text-xs font-black uppercase text-primary">Role Interaction</p>
          <h1 className="mt-2 font-display text-4xl font-black md:text-6xl">角色互动</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">使用自己的角色资产预演口癖、关系和场景对话。可以选择免费 AI 或模板演示。AI 结果同步到云端创作历史；下方手动保存的互动记录保存在当前设备的本账号下。</p>
        </div>
        <FeatureArtPanel src="/images/artwork/starlight-mage.png" alt="星光魔法少女原创角色插画" eyebrow="角色语气预演" caption="围绕已保存角色测试口癖、关系和场景反应" className="min-h-[220px]" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.42fr_0.58fr]">
        <section className="h-fit rounded-card border border-line bg-white p-5 shadow-soft">
          <GenerationModePicker value={mode} onChange={setMode} disabled={generating} />
          <label className="mt-5 block text-sm font-black" htmlFor="character">
            选择角色资产
          </label>
          {loading ? <p role="status">正在读取角色…</p> : error ? <p role="alert" className="text-danger">{error} <button onClick={() => void refresh()} className="underline">重试</button></p> : characters.length === 0 ? <p className="mt-2 text-sm text-muted">请先在创作页保存一个角色。</p> : null}
          <select
            id="character"
            disabled={generating}
            value={characterId}
            onChange={(event) => setCharacterId(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-pill border border-line bg-bg px-4 text-sm font-bold outline-none focus:border-primary"
          >
            {characters.map((character) => (
              <option key={character.id} value={character.id}>
                {character.name} · {character.identity}
              </option>
            ))}
          </select>

          <fieldset disabled={generating} className="mt-5">
            <legend className="text-sm font-black">互动场景</legend>
            <div className="mt-2 grid gap-2">
              {interactionPrompts.map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  onClick={() => setPromptId(prompt.id)}
                  className={cn(
                    "rounded-card px-4 py-3 text-left text-sm font-bold transition",
                    promptId === prompt.id ? "bg-ink text-white" : "bg-bg text-muted hover:bg-primary/15 hover:text-ink"
                  )}
                >
                  <span className="block font-black">{prompt.title}</span>
                  <span className="mt-1 block text-xs opacity-75">{prompt.relationship}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <label className="mt-5 block text-sm font-black" htmlFor="scene">
            自定义场景
          </label>
          <textarea
            id="scene"
            maxLength={1200}
            disabled={generating}
            value={customScene}
            onChange={(event) => setCustomScene(event.target.value)}
            rows={4}
            className="mt-2 w-full rounded-[24px] border border-line bg-bg px-4 py-3 text-sm leading-6 outline-none focus:border-primary"
            placeholder={selectedPrompt.scene}
          />

          <Button type="button" className="mt-5 w-full" disabled={generating || loading || !!error || !selectedCharacter} onClick={generateDialogue}>
            <MessageCircle size={18} aria-hidden="true" />
            {generating ? "正在生成对话…" : "生成互动会话"}
          </Button>
        </section>

        <section className="rounded-card border border-line bg-white p-5 shadow-soft">
          {selectedCharacter ? (
            <div className="mb-5 rounded-card bg-bg p-4">
              <p className="text-xs font-black uppercase text-primary">Selected Character</p>
              <h2 className="mt-2 font-display text-3xl font-black">{selectedCharacter.name}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{selectedCharacter.summary}</p>
              <p className="mt-3 text-sm font-black text-ink">口癖：{selectedCharacter.speech}</p>
            </div>
          ) : null}

          {generating ? <p role="status" className="mb-4 text-sm font-bold">正在生成，请稍候…</p> : null}
          {generationError ? <p role="alert" className="mb-4 text-sm text-danger">{generationError}</p> : null}
          {result.length > 0 ? (
            <>
              <p className="mb-3 text-sm font-bold text-muted">{resultContext?.mode === "ai" ? "AI" : "模板"} · {resultContext?.characterName} · {resultContext?.scene}</p>
              <div className="space-y-3">
                {result.map((line, index) => (
                  <p key={index} className="rounded-card bg-bg px-4 py-3 text-sm font-semibold leading-6 text-ink">
                    {line}
                  </p>
                ))}
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button type="button" variant="secondary" className="flex-1" onClick={copyDialogue}>
                  <Copy size={17} aria-hidden="true" />
                  复制
                </Button>
                <Button type="button" variant="secondary" className="flex-1" onClick={saveDialogue}>
                  <Save size={17} aria-hidden="true" />
                  保存记录
                </Button>
              </div>
            </>
          ) : (
            <div className="grid min-h-[320px] place-items-center rounded-card border border-dashed border-line bg-bg p-6 text-center">
              <div>
                <p className="mx-auto grid size-14 place-items-center rounded-pill bg-primary/20">
                  <MessageCircle size={24} aria-hidden="true" />
                </p>
                <h2 className="mt-4 font-display text-2xl font-black">互动会话会出现在这里</h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">选择角色资产和场景后，生成几段用于测试口癖与关系动态的对话。</p>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-card border border-line bg-white p-5 shadow-soft">
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase text-primary">Local history</p><h2 className="mt-1 font-display text-2xl font-black">已保存互动记录</h2></div><span className="rounded-pill bg-bg px-3 py-1 text-xs font-black text-muted">{savedInteractions.length} 条</span></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {savedInteractions.map((interaction) => <article key={interaction.id} className="rounded-[20px] bg-bg p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black">{interaction.mode === "ai" ? "AI · " : "模板 · "}{interaction.characterName}</p><p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-muted">{interaction.scene}</p></div><div className="flex items-center gap-2"><time className="shrink-0 text-[11px] font-bold text-muted">{new Date(interaction.createdAt).toLocaleDateString("zh-CN")}</time><button type="button" onClick={() => removeSavedInteraction(interaction.id)} aria-label={`删除互动记录-${interaction.id}`} className="grid size-9 place-items-center rounded-full bg-white text-danger"><Trash2 size={14} /></button></div></div><p className="mt-3 line-clamp-2 text-xs font-semibold leading-5 text-ink">{interaction.lines[0]}</p></article>)}
          {savedInteractions.length === 0 ? <p className="rounded-[20px] border border-dashed border-line p-6 text-center text-sm font-semibold text-muted md:col-span-2">还没有保存记录。生成对话后点击“保存记录”。</p> : null}
        </div>
      </section>

      <Toast message={toast} />
    </div>
  );
}
