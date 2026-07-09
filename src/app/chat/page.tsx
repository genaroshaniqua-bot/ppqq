"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, MessageCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { mockCharacters } from "@/data/mock-characters";
import { interactionPrompts } from "@/data/mock-platform";
import { readCharacters } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { Character } from "@/types/character";

export default function ChatPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [characterId, setCharacterId] = useState("");
  const [promptId, setPromptId] = useState(interactionPrompts[0].id);
  const [customScene, setCustomScene] = useState("");
  const [result, setResult] = useState<string[]>([]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const stored = readCharacters();
    const next = stored.length > 0 ? stored : mockCharacters;
    setCharacters(next);
    setCharacterId(next[0]?.id ?? "");
  }, []);

  const selectedCharacter = useMemo(() => characters.find((character) => character.id === characterId), [characters, characterId]);
  const selectedPrompt = interactionPrompts.find((prompt) => prompt.id === promptId) ?? interactionPrompts[0];

  function generateDialogue() {
    if (!selectedCharacter) return;
    const scene = customScene.trim() || selectedPrompt.scene;
    setResult([
      `${selectedCharacter.name}：${selectedPrompt.sampleLines[0]}`,
      `你：如果这次我想换一种做法呢？`,
      `${selectedCharacter.name}：${selectedCharacter.speech}`,
      `${selectedCharacter.name}：场景是“${scene}”。关系先别急着升温，先让行动证明。`
    ]);
    setToast("互动会话已生成");
  }

  async function copyDialogue() {
    if (result.length === 0) return;
    await navigator.clipboard.writeText(result.join("\n"));
    setToast("互动会话已复制");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-7 rounded-[36px] border border-line bg-white p-6 shadow-soft md:p-8">
        <p className="text-xs font-black uppercase text-primary">Role Interaction</p>
        <h1 className="mt-2 font-display text-4xl font-black md:text-6xl">角色互动</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
          从自己的角色资产开始测试口癖、关系动态和场景对话。这里不是预置陪聊角色池，当前只做前端模拟。
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.42fr_0.58fr]">
        <section className="h-fit rounded-card border border-line bg-white p-5 shadow-soft">
          <label className="text-sm font-black" htmlFor="character">
            选择角色资产
          </label>
          <select
            id="character"
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

          <fieldset className="mt-5">
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
            value={customScene}
            onChange={(event) => setCustomScene(event.target.value)}
            rows={4}
            className="mt-2 w-full rounded-[24px] border border-line bg-bg px-4 py-3 text-sm leading-6 outline-none focus:border-primary"
            placeholder={selectedPrompt.scene}
          />

          <Button type="button" className="mt-5 w-full" onClick={generateDialogue}>
            <MessageCircle size={18} aria-hidden="true" />
            生成互动会话
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

          {result.length > 0 ? (
            <>
              <div className="space-y-3">
                {result.map((line) => (
                  <p key={line} className="rounded-card bg-bg px-4 py-3 text-sm font-semibold leading-6 text-ink">
                    {line}
                  </p>
                ))}
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button type="button" variant="secondary" className="flex-1" onClick={copyDialogue}>
                  <Copy size={17} aria-hidden="true" />
                  复制
                </Button>
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setToast("已保存为前端互动记录")}>
                  <Save size={17} aria-hidden="true" />
                  保存演示
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
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">选择角色资产和场景后，生成几段用于测试口癖与关系动态的模拟对话。</p>
              </div>
            </div>
          )}
        </section>
      </div>

      <Toast message={toast} />
    </div>
  );
}
