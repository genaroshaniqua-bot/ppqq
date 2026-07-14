"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Copy, Package, Sparkles } from "lucide-react";
import { CharacterCard } from "@/components/character/CharacterCard";
import { ContinuationCard } from "@/components/generation/ContinuationCard";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { generateAvatarPrompt, generateDialogue, generateMerch, generateStory } from "@/lib/mock-generate";
import { readCharacters } from "@/lib/storage";
import type { Character, CharacterContinuation } from "@/types/character";

export default function CharacterDetailPage() {
  const params = useParams<{ id: string }>();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [generated, setGenerated] = useState<CharacterContinuation | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    setCharacters(readCharacters());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const character = useMemo(() => characters.find((item) => item.id === params.id), [characters, params.id]);

  async function copyCharacter() {
    if (!character) return;
    await navigator.clipboard.writeText(`${character.name}\n${character.summary}\n${character.background}`);
    setToast("角色摘要已复制");
  }

  async function copyGenerated() {
    if (!generated) return;
    await navigator.clipboard.writeText(`${generated.title}\n${generated.body}\n${generated.bullets.join("\n")}`);
    setToast("生成内容已复制");
  }

  if (!character) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-black">没有找到这个角色</h1>
        <p className="mt-3 text-sm leading-6 text-muted">角色可能尚未保存到本地角色库，或者本地数据已被清空。</p>
        <Link href="/characters" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-pill bg-ink px-5 text-sm font-black text-white">
          返回角色库
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/characters" className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-pill bg-white px-4 text-sm font-black shadow-soft">
        <ArrowLeft size={16} aria-hidden="true" />
        返回角色库
      </Link>

      <section className="grid gap-6 lg:grid-cols-[0.42fr_0.58fr]">
        <div className="space-y-5">
          <CharacterCard character={character} />
          <div className="rounded-card border border-line bg-white p-5 shadow-soft">
            <h2 className="font-display text-2xl font-black">角色卡摘要</h2>
            <p className="mt-3 text-sm leading-7 text-muted">{character.summary}</p>
            <Button type="button" variant="secondary" className="mt-4 w-full" onClick={copyCharacter}>
              <Copy size={17} aria-hidden="true" />
              复制摘要
            </Button>
          </div>
        </div>

        <div className="space-y-5">
          <section className="overflow-hidden rounded-[32px] border border-line bg-white shadow-soft">
            <div className="relative h-64">
              <Image
                src="/images/artwork/pink-fish.jpg"
                alt={`${character.name} 的详情视觉`}
                fill
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover"
                style={{ objectPosition: character.imagePosition }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 text-white">
                <p className="text-xs font-black uppercase text-lime">Character Detail</p>
                <h1 className="mt-1 font-display text-4xl font-black">{character.name}</h1>
                <p className="mt-2 text-sm font-bold text-white/76">{character.identity}</p>
              </div>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <Detail title="外貌" body={character.appearance} />
              <Detail title="性格" body={character.personality.join(" / ")} />
              <Detail title="背景" body={character.background} />
              <Detail title="能力" body={character.ability} />
              <Detail title="弱点" body={character.weakness} />
              <Detail title="口癖" body={character.speech} />
            </div>
          </section>

          <section className="rounded-card border border-line bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-primary">Continue Creation</p>
                <h2 className="mt-1 font-display text-2xl font-black">基于角色继续生成</h2>
                <p className="mt-2 text-sm leading-6 text-muted">所有结果都是前端 mock，可复制后用于设定集、约稿说明或摊宣准备。</p>
              </div>
              <Sparkles className="hidden text-primary sm:block" size={28} aria-hidden="true" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button type="button" variant="secondary" onClick={() => setGenerated(generateStory(character))}>
                剧情生成
              </Button>
              <Button type="button" variant="secondary" onClick={() => setGenerated(generateDialogue(character))}>
                对话风格
              </Button>
              <Button type="button" variant="secondary" onClick={() => setGenerated(generateAvatarPrompt(character))}>
                头像提示词
              </Button>
              <Button type="button" variant="secondary" onClick={() => setGenerated(generateMerch(character))}>
                <Package size={17} aria-hidden="true" />
                周边说明
              </Button>
            </div>
          </section>

          {generated ? <ContinuationCard item={generated} onCopy={copyGenerated} /> : null}
        </div>
      </section>
      <Toast message={toast} />
    </div>
  );
}

function Detail({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-card bg-bg p-4">
      <h2 className="text-sm font-black">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
    </div>
  );
}
